package response

import (
	"net/http"
	"reflect"

	"github.com/gin-gonic/gin"
)

type Meta struct {
	Total      int64 `json:"total,omitempty"`
	Page       int   `json:"page,omitempty"`
	PerPage    int   `json:"per_page,omitempty"`
	TotalPages int   `json:"total_pages,omitempty"`
}

type envelope struct {
	Success   bool        `json:"success"`
	Data      interface{} `json:"data,omitempty"`
	Meta      *Meta       `json:"meta,omitempty"`
	Error     *apiErr     `json:"error,omitempty"`
	Timestamp string      `json:"timestamp,omitempty"`
}

type apiErr struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

func coalesceNilSlice(data interface{}) interface{} {
	if data == nil {
		return []interface{}{}
	}
	v := reflect.ValueOf(data)
	if v.Kind() == reflect.Slice && v.IsNil() {
		return reflect.MakeSlice(v.Type(), 0, 0).Interface()
	}
	return data
}

func OK(c *gin.Context, data interface{}) {
	c.JSON(http.StatusOK, envelope{Success: true, Data: coalesceNilSlice(data)})
}

func OKMeta(c *gin.Context, data interface{}, meta Meta) {
	c.JSON(http.StatusOK, envelope{Success: true, Data: coalesceNilSlice(data), Meta: &meta})
}

func Created(c *gin.Context, data interface{}) {
	c.JSON(http.StatusCreated, envelope{Success: true, Data: data})
}

func Error(c *gin.Context, status int, code, message string) {
	c.JSON(status, envelope{Success: false, Error: &apiErr{Code: code, Message: message}})
}

func Unauthorized(c *gin.Context, message string) {
	Error(c, http.StatusUnauthorized, "UNAUTHORIZED", message)
}

func Forbidden(c *gin.Context) {
	Error(c, http.StatusForbidden, "INSUFFICIENT_PERMISSIONS", "insufficient permissions")
}

func NotFound(c *gin.Context, message string) {
	Error(c, http.StatusNotFound, "NOT_FOUND", message)
}

func BadRequest(c *gin.Context, message string) {
	Error(c, http.StatusBadRequest, "VALIDATION_ERROR", message)
}

func Internal(c *gin.Context, message string) {
	Error(c, http.StatusInternalServerError, "INTERNAL_ERROR", message)
}
