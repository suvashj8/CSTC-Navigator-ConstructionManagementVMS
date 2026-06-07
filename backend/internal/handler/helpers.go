package handler

import (
	"strings"
	"time"

	"github.com/google/uuid"
)

func derefStr(s *string) string {
	if s == nil {
		return ""
	}
	return *s
}

func intPtr(v *int32) *int {
	if v == nil {
		return nil
	}
	n := int(*v)
	return &n
}

func floatPtr(v *float64) *float64 {
	return v
}

func uuidToStr(id *uuid.UUID) *string {
	if id == nil {
		return nil
	}
	s := id.String()
	return &s
}

func datePtr(t *time.Time) *string {
	if t == nil {
		return nil
	}
	s := t.Format("2006-01-02")
	return &s
}

func nullIfEmpty(s string) interface{} {
	if strings.TrimSpace(s) == "" {
		return nil
	}
	return s
}

func parseDate(s string) *time.Time {
	s = strings.TrimSpace(s)
	if s == "" {
		return nil
	}
	for _, layout := range []string{"2006-01-02", "01/02/2006", time.RFC3339} {
		if t, err := time.Parse(layout, s); err == nil {
			utc := time.Date(t.Year(), t.Month(), t.Day(), 0, 0, 0, 0, time.UTC)
			return &utc
		}
	}
	return nil
}
