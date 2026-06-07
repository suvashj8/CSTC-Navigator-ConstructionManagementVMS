package main

import (
	"context"
	"log"
	"os"
	"os/signal"
	"syscall"

	"github.com/gin-gonic/gin"
	"github.com/hibiken/asynq"
	"github.com/navigator/vms/internal/config"
	"github.com/navigator/vms/internal/handler"
	"github.com/navigator/vms/internal/queue"
	"github.com/navigator/vms/pkg/database"
	"github.com/navigator/vms/pkg/seed"
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
	if err := tm.InitMain(ctx); err != nil {
		log.Fatalf("main migrations: %v", err)
	}

	if cfg.SeedOnStartup {
		if err := seed.Run(ctx, cfg, tm); err != nil {
			log.Printf("seed warning: %v", err)
		}
	}

	if err := os.MkdirAll(cfg.ExportDir, 0o755); err != nil {
		log.Fatalf("export dir: %v", err)
	}

	var qClient *asynq.Client
	if addr := cfg.RedisAddr; addr != "" {
		qClient = queue.NewClient(addr)
	}

	gin.SetMode(gin.ReleaseMode)
	r := gin.New()
	r.Use(gin.Recovery(), gin.Logger())

	api := &handler.API{Cfg: cfg, TM: tm, Queue: qClient}
	api.Register(r)

	go func() {
		log.Printf("VMS API listening on :%s", cfg.Port)
		if err := r.Run(":" + cfg.Port); err != nil {
			log.Fatalf("server: %v", err)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
}
