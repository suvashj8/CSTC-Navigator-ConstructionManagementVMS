package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
	"time"
)

const baseURL = "http://localhost:8080"

type envelope struct {
	Success bool            `json:"success"`
	Data    json.RawMessage `json:"data"`
	Error   *struct {
		Message string `json:"message"`
	} `json:"error"`
}

func main() {
	base := os.Getenv("SMOKE_BASE_URL")
	if base == "" {
		base = baseURL
	}
	failures := 0
	check := func(name string, fn func() error) {
		if err := fn(); err != nil {
			fmt.Printf("FAIL  %s: %v\n", name, err)
			failures++
		} else {
			fmt.Printf("OK    %s\n", name)
		}
	}

	check("health", func() error {
		var env envelope
		if err := getJSON(base+"/health", "", nil, &env); err != nil {
			return err
		}
		if !env.Success {
			return fmt.Errorf("health not success")
		}
		return nil
	})

	var loginData struct {
		AccessToken string `json:"access_token"`
		User        struct {
			Email string `json:"email"`
		} `json:"user"`
	}
	check("tenant login", func() error {
		body := `{"email":"admin@vms.local","password":"admin123"}`
		var env envelope
		if err := postJSON(base+"/api/v1/auth/login", body, map[string]string{"X-Tenant-Subdomain": "demo"}, &env); err != nil {
			return err
		}
		if !env.Success {
			return fmt.Errorf("%s", errMsg(env))
		}
		if err := json.Unmarshal(env.Data, &loginData); err != nil {
			return err
		}
		if loginData.AccessToken == "" {
			return fmt.Errorf("missing token")
		}
		return nil
	})

	token := loginData.AccessToken
	auth := map[string]string{
		"Authorization":        "Bearer " + token,
		"X-Tenant-Subdomain":   "demo",
	}

	check("dashboard stats", func() error {
		var env envelope
		return getJSON(base+"/api/v1/dashboard/stats", token, auth, &env)
	})

	check("list assets (paginated)", func() error {
		var env envelope
		if err := getJSON(base+"/api/v1/assets?page=1&per_page=5", token, auth, &env); err != nil {
			return err
		}
		if !env.Success {
			return fmt.Errorf("%s", errMsg(env))
		}
		return nil
	})

	check("create location", func() error {
		body := fmt.Sprintf(`{"name":"Smoke Site %d","type":"construction","address":"Test"}`, time.Now().Unix())
		var env envelope
		if err := postJSON(base+"/api/v1/locations", body, auth, &env); err != nil {
			return err
		}
		if !env.Success {
			return fmt.Errorf("%s", errMsg(env))
		}
		return nil
	})

	var reportJobID string
	check("report job json", func() error {
		body := `{"report_type":"location-assets","export_format":"json"}`
		var env envelope
		if err := postJSON(base+"/api/v1/reports/jobs", body, auth, &env); err != nil {
			return err
		}
		if !env.Success {
			return fmt.Errorf("%s", errMsg(env))
		}
		var job struct {
			ID     string `json:"id"`
			Status string `json:"status"`
		}
		if err := json.Unmarshal(env.Data, &job); err != nil {
			return err
		}
		reportJobID = job.ID
		if job.Status != "completed" && job.Status != "pending" && job.Status != "processing" {
			return fmt.Errorf("unexpected status %s", job.Status)
		}
		return nil
	})

	if reportJobID != "" {
		check("poll report job", func() error {
			deadline := time.Now().Add(30 * time.Second)
			for time.Now().Before(deadline) {
				var env envelope
				if err := getJSON(base+"/api/v1/reports/jobs/"+reportJobID, token, auth, &env); err != nil {
					return err
				}
				var job struct {
					Status string `json:"status"`
				}
				_ = json.Unmarshal(env.Data, &job)
				if job.Status == "completed" || job.Status == "failed" {
					if job.Status == "failed" {
						return fmt.Errorf("report failed")
					}
					return nil
				}
				time.Sleep(500 * time.Millisecond)
			}
			return fmt.Errorf("report job timeout")
		})
	}

	var platformToken string
	check("platform login", func() error {
		body := `{"email":"super@vms.local","password":"super123"}`
		var env envelope
		if err := postJSON(base+"/api/v1/platform/auth/login", body, nil, &env); err != nil {
			return err
		}
		if !env.Success {
			return fmt.Errorf("%s", errMsg(env))
		}
		var res struct {
			AccessToken string `json:"access_token"`
		}
		_ = json.Unmarshal(env.Data, &res)
		platformToken = res.AccessToken
		return nil
	})

	check("expiry scan enqueue", func() error {
		if platformToken == "" {
			return fmt.Errorf("no platform token")
		}
		var env envelope
		return postJSON(base+"/api/v1/platform/jobs/expiry-scan", "{}", map[string]string{
			"Authorization": "Bearer " + platformToken,
		}, &env)
	})

	if failures > 0 {
		fmt.Printf("\n%d check(s) failed\n", failures)
		os.Exit(1)
	}
	fmt.Println("\nAll smoke checks passed")
}

func errMsg(env envelope) string {
	if env.Error != nil {
		return env.Error.Message
	}
	return "request failed"
}

func getJSON(url, token string, headers map[string]string, out *envelope) error {
	req, _ := http.NewRequest(http.MethodGet, url, nil)
	for k, v := range headers {
		req.Header.Set(k, v)
	}
	if token != "" && req.Header.Get("Authorization") == "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	b, _ := io.ReadAll(resp.Body)
	if resp.StatusCode >= 400 {
		return fmt.Errorf("HTTP %d: %s", resp.StatusCode, strings.TrimSpace(string(b)))
	}
	return json.Unmarshal(b, out)
}

func postJSON(url, body string, headers map[string]string, out *envelope) error {
	req, _ := http.NewRequest(http.MethodPost, url, bytes.NewBufferString(body))
	req.Header.Set("Content-Type", "application/json")
	for k, v := range headers {
		req.Header.Set(k, v)
	}
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	b, _ := io.ReadAll(resp.Body)
	if resp.StatusCode >= 400 {
		return fmt.Errorf("HTTP %d: %s", resp.StatusCode, strings.TrimSpace(string(b)))
	}
	return json.Unmarshal(b, out)
}
