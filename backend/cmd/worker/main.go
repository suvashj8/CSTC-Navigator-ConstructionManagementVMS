package main

import (
	"context"
	"log"
	"os"
	"os/signal"
	"syscall"

	"github.com/navigator/vms/internal/config"
	"github.com/navigator/vms/internal/queue"
	"github.com/navigator/vms/pkg/database"
	"github.com/navigator/vms/pkg/tenantmgr"
)

func main() {
	cfg := config.Load()
	ctx := context.Background()

	mainPool, err := database.Connect(ctx, cfg.MainDatabaseURL)
	if err != nil {
		log.Fatalf("main db connect: %v", err)
	}
	defer mainPool.Close()

	tm := tenantmgr.New(cfg, mainPool)
	if err := os.MkdirAll(cfg.ExportDir, 0o755); err != nil {
		log.Fatalf("export dir: %v", err)
	}

	mux := queue.NewServerMux(tm, cfg.ExportDir)

	if _, err := queue.StartScheduler(cfg.RedisAddr); err != nil {
		log.Printf("scheduler warning: %v", err)
	}

	go func() {
		log.Printf("VMS worker listening on redis %s", cfg.RedisAddr)
		if err := queue.StartWorker(cfg.RedisAddr, mux); err != nil {
			log.Fatalf("worker: %v", err)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
}
