package config

import (
	"fmt"
	"os"
	"strings"
	"time"
)

type Config struct {
	MainDatabaseURL string
	RedisAddr       string
	JWTSecret       string
	JWTExpiry       time.Duration
	Port            string
	AllowedOrigins  []string
	ExportDir       string
	SeedOnStartup   bool
	DBHost          string
	DBPort          string
	DBUser          string
	DBPassword      string
}

func Load() *Config {
	jwtExp, _ := time.ParseDuration(getEnv("JWT_EXPIRES_IN", "15m"))
	if jwtExp == 0 {
		jwtExp = 15 * time.Minute
	}
	host := getEnv("MAIN_DB_HOST", "localhost")
	port := getEnv("MAIN_DB_PORT", "5432")
	user := getEnv("MAIN_DB_USER", "vms")
	pass := getEnv("MAIN_DB_PASSWORD", "vms")
	name := getEnv("MAIN_DB_NAME", "vms_main")
	mainURL := getEnv("MAIN_DATABASE_URL", "")
	if mainURL == "" {
		mainURL = fmt.Sprintf("postgres://%s:%s@%s:%s/%s?sslmode=disable", user, pass, host, port, name)
	}
	origins := strings.Split(getEnv("CORS_ORIGINS", "http://localhost:5173,capacitor://localhost,http://localhost"), ",")
	var list []string
	for _, o := range origins {
		if s := strings.TrimSpace(o); s != "" {
			list = append(list, s)
		}
	}
	return &Config{
		MainDatabaseURL: mainURL,
		RedisAddr:       getEnv("REDIS_ADDR", getEnv("REDIS_HOST", "localhost")+":"+getEnv("REDIS_PORT", "6379")),
		JWTSecret:       getEnv("JWT_SECRET", "dev-jwt-secret-change-in-production-min-32-chars"),
		JWTExpiry:       jwtExp,
		Port:            getEnv("PORT", "8080"),
		AllowedOrigins:  list,
		ExportDir:       getEnv("EXPORT_DIR", "./exports"),
		SeedOnStartup:   getEnv("SEED_ON_STARTUP", "true") == "true",
		DBHost:          host,
		DBPort:          port,
		DBUser:          user,
		DBPassword:      pass,
	}
}

func getEnv(key, def string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return def
}
