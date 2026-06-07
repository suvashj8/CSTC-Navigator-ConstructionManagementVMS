package health

import (
	"context"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"
)

type Status struct {
	Status   string            `json:"status"`
	Postgres string            `json:"postgres"`
	Redis    string            `json:"redis,omitempty"`
	Checks   map[string]string `json:"checks,omitempty"`
}

func Check(ctx context.Context, db *pgxpool.Pool, redisAddr string) Status {
	checks := map[string]string{}
	overall := "ok"

	if err := db.Ping(ctx); err != nil {
		checks["postgres"] = err.Error()
		overall = "degraded"
	} else {
		checks["postgres"] = "ok"
	}

	if redisAddr != "" {
		rdb := redis.NewClient(&redis.Options{Addr: redisAddr})
		defer rdb.Close()
		pctx, cancel := context.WithTimeout(ctx, 2*time.Second)
		defer cancel()
		if err := rdb.Ping(pctx).Err(); err != nil {
			checks["redis"] = err.Error()
			overall = "degraded"
		} else {
			checks["redis"] = "ok"
		}
	}

	return Status{
		Status:   overall,
		Postgres: checks["postgres"],
		Redis:    checks["redis"],
		Checks:   checks,
	}
}
