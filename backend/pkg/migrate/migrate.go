package migrate

import (
	"context"
	"embed"
	"sort"
	"strings"

	"github.com/jackc/pgx/v5/pgxpool"
)

//go:embed sql/main/*.sql
var mainFS embed.FS

//go:embed sql/tenant/*.sql
var tenantFS embed.FS

func runEmbed(ctx context.Context, pool *pgxpool.Pool, fs embed.FS, prefix string) error {
	entries, err := fs.ReadDir(prefix)
	if err != nil {
		return err
	}
	names := make([]string, 0, len(entries))
	for _, e := range entries {
		if strings.HasSuffix(e.Name(), ".sql") {
			names = append(names, e.Name())
		}
	}
	sort.Strings(names)
	for _, name := range names {
		b, err := fs.ReadFile(prefix + "/" + name)
		if err != nil {
			return err
		}
		if _, err := pool.Exec(ctx, string(b)); err != nil {
			return err
		}
	}
	return nil
}

func MainUp(ctx context.Context, pool *pgxpool.Pool) error {
	return runEmbed(ctx, pool, mainFS, "sql/main")
}

func TenantUp(ctx context.Context, pool *pgxpool.Pool) error {
	return runEmbed(ctx, pool, tenantFS, "sql/tenant")
}
