package handler

import (
	"context"
	"fmt"
	"math"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/navigator/vms/pkg/response"
)

type pageParams struct {
	Page    int
	PerPage int
	Offset  int
}

func pageFromContext(c *gin.Context) pageParams {
	page, per := pageQuery(c)
	if per > 100 {
		per = 100
	}
	return pageParams{Page: page, PerPage: per, Offset: (page - 1) * per}
}

func totalPages(total int64, perPage int) int {
	if perPage <= 0 {
		return 0
	}
	return int(math.Ceil(float64(total) / float64(perPage)))
}

func respondPaginated(c *gin.Context, rows []gin.H, total int64, p pageParams) {
	response.OKMeta(c, rows, response.Meta{
		Total:      total,
		Page:       p.Page,
		PerPage:    p.PerPage,
		TotalPages: totalPages(total, p.PerPage),
	})
}

func countQuery(ctx context.Context, pool *pgxpool.Pool, q string, args ...any) (int64, error) {
	var total int64
	err := pool.QueryRow(ctx, q, args...).Scan(&total)
	return total, err
}

func paginatedQuery(
	ctx context.Context,
	pool *pgxpool.Pool,
	p pageParams,
	countSQL string,
	countArgs []any,
	dataSQL string,
	dataArgs []any,
	scan func(pgx.Rows) (gin.H, error),
) ([]gin.H, int64, error) {
	total, err := countQuery(ctx, pool, countSQL, countArgs...)
	if err != nil {
		return nil, 0, err
	}
	limitIdx := len(dataArgs) + 1
	offsetIdx := len(dataArgs) + 2
	q := dataSQL + fmt.Sprintf(" LIMIT $%d OFFSET $%d", limitIdx, offsetIdx)
	args := append(append([]any{}, dataArgs...), p.PerPage, p.Offset)
	rows, err := pool.Query(ctx, q, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()
	var list []gin.H
	for rows.Next() {
		item, err := scan(rows)
		if err != nil {
			return nil, 0, err
		}
		list = append(list, item)
	}
	if list == nil {
		list = []gin.H{}
	}
	return list, total, nil
}
