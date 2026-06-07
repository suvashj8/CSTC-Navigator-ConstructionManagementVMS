package queue

import (
	"context"
	"encoding/json"

	"github.com/google/uuid"
	"github.com/hibiken/asynq"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/navigator/vms/internal/reports"
	"github.com/navigator/vms/pkg/tenantmgr"
)

const (
	TypeReport       = "report:run"
	TypeNotification = "notification:send"
)

type ReportPayload struct {
	JobID        string `json:"job_id"`
	TenantID     string `json:"tenant_id"`
	ReportType   string `json:"report_type"`
	ExportFormat string `json:"export_format"`
}

type NotificationPayload struct {
	TenantID    string `json:"tenant_id"`
	RecipientID string `json:"recipient_id,omitempty"`
	Type        string `json:"type"`
	Title       string `json:"title"`
	Message     string `json:"message"`
}

type Server struct {
	TM        *tenantmgr.Manager
	ExportDir string
}

func NewServer(tm *tenantmgr.Manager, exportDir string) *Server {
	return &Server{TM: tm, ExportDir: exportDir}
}

func (s *Server) Register(mux *asynq.ServeMux) {
	mux.HandleFunc(TypeReport, s.handleReport)
	mux.HandleFunc(TypeNotification, s.handleNotification)
}

func (s *Server) handleReport(ctx context.Context, t *asynq.Task) error {
	var p ReportPayload
	if err := json.Unmarshal(t.Payload(), &p); err != nil {
		return err
	}
	tid, err := uuid.Parse(p.TenantID)
	if err != nil {
		return err
	}
	jid, err := uuid.Parse(p.JobID)
	if err != nil {
		return err
	}
	pool, err := s.TM.Pool(ctx, tid)
	if err != nil {
		return err
	}
	_, _ = pool.Exec(ctx, `UPDATE report_jobs SET status = 'processing' WHERE job_id = $1`, jid)

	rows, err := reports.RunQuery(ctx, pool, p.ReportType)
	if err != nil {
		_, _ = pool.Exec(ctx, `UPDATE report_jobs SET status = 'failed', error_message = $2 WHERE job_id = $1`, jid, err.Error())
		return err
	}
	result, _ := reports.RowsToJSON(rows)
	var filePath, fileName *string
	if p.ExportFormat == "pdf" {
		fp, fn, err := reports.ExportPDF(s.ExportDir, p.ReportType, rows)
		if err != nil {
			_, _ = pool.Exec(ctx, `UPDATE report_jobs SET status = 'failed', error_message = $2 WHERE job_id = $1`, jid, err.Error())
			return err
		}
		filePath, fileName = &fp, &fn
	} else if p.ExportFormat == "xlsx" {
		fp, fn, err := reports.ExportExcel(s.ExportDir, p.ReportType, rows)
		if err != nil {
			_, _ = pool.Exec(ctx, `UPDATE report_jobs SET status = 'failed', error_message = $2 WHERE job_id = $1`, jid, err.Error())
			return err
		}
		filePath, fileName = &fp, &fn
	}
	_, err = pool.Exec(ctx, `
		UPDATE report_jobs SET status = 'completed', result = $2, file_path = $3, file_name = $4, completed_at = NOW()
		WHERE job_id = $1`, jid, result, filePath, fileName)
	return err
}

func (s *Server) handleNotification(ctx context.Context, t *asynq.Task) error {
	var p NotificationPayload
	if err := json.Unmarshal(t.Payload(), &p); err != nil {
		return err
	}
	tid, err := uuid.Parse(p.TenantID)
	if err != nil {
		return err
	}
	pool, err := s.TM.Pool(ctx, tid)
	if err != nil {
		return err
	}
	var rid *uuid.UUID
	if p.RecipientID != "" {
		id, err := uuid.Parse(p.RecipientID)
		if err == nil {
			rid = &id
		}
	}
	_, err = pool.Exec(ctx, `
		INSERT INTO notifications (recipient_id, type, title, message, channel, status, sent_at)
		VALUES ($1,$2,$3,$4,'in_app','sent',NOW())`, rid, p.Type, p.Title, p.Message)
	return err
}

func EnqueueReport(client *asynq.Client, p ReportPayload) error {
	b, _ := json.Marshal(p)
	_, err := client.Enqueue(asynq.NewTask(TypeReport, b), asynq.MaxRetry(3))
	return err
}

func EnqueueNotification(client *asynq.Client, p NotificationPayload) error {
	b, _ := json.Marshal(p)
	_, err := client.Enqueue(asynq.NewTask(TypeNotification, b), asynq.MaxRetry(3))
	return err
}

func NewClient(redisAddr string) *asynq.Client {
	return asynq.NewClient(asynq.RedisClientOpt{Addr: redisAddr})
}

func NewServerMux(tm *tenantmgr.Manager, exportDir string) *asynq.ServeMux {
	s := NewServer(tm, exportDir)
	mux := asynq.NewServeMux()
	s.Register(mux)
	s.RegisterExpiry(mux)
	return mux
}

func StartWorker(redisAddr string, mux *asynq.ServeMux) error {
	srv := asynq.NewServer(asynq.RedisClientOpt{Addr: redisAddr}, asynq.Config{Concurrency: 4})
	return srv.Run(mux)
}

func FindCachedJob(ctx context.Context, pool *pgxpool.Pool, hash string) (uuid.UUID, bool) {
	var id uuid.UUID
	err := pool.QueryRow(ctx, `
		SELECT job_id FROM report_jobs WHERE params_hash = $1 AND status = 'completed'
		AND created_at > NOW() - INTERVAL '10 minutes' ORDER BY created_at DESC LIMIT 1`, hash).Scan(&id)
	return id, err == nil
}
