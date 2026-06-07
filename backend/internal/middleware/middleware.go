package middleware

import (
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/navigator/vms/pkg/response"
)

const UserKey = "claims"

type Claims struct {
	Sub          string   `json:"sub"`
	Email        string   `json:"email"`
	Role         string   `json:"role"`
	TenantID     string   `json:"tenant_id,omitempty"`
	TenantName   string   `json:"tenant_name,omitempty"`
	LocationIDs  []string `json:"location_ids,omitempty"`
	TokenType    string   `json:"token_type"`
	Impersonated string   `json:"impersonated_by,omitempty"`
	jwt.RegisteredClaims
}

func JWT(secret string) gin.HandlerFunc {
	return func(c *gin.Context) {
		h := c.GetHeader("Authorization")
		if h == "" || !strings.HasPrefix(h, "Bearer ") {
			response.Unauthorized(c, "missing bearer token")
			c.Abort()
			return
		}
		raw := strings.TrimSpace(strings.TrimPrefix(h, "Bearer "))
		claims := &Claims{}
		tok, err := jwt.ParseWithClaims(raw, claims, func(t *jwt.Token) (interface{}, error) {
			return []byte(secret), nil
		})
		if err != nil || !tok.Valid {
			response.Unauthorized(c, "invalid token")
			c.Abort()
			return
		}
		c.Set(UserKey, claims)
		c.Next()
	}
}

func ClaimsFrom(c *gin.Context) (*Claims, bool) {
	v, ok := c.Get(UserKey)
	if !ok {
		return nil, false
	}
	cl, ok := v.(*Claims)
	return cl, ok
}

func RequireTenant(c *gin.Context) {
	cl, ok := ClaimsFrom(c)
	if !ok || cl.TenantID == "" {
		response.Forbidden(c)
		c.Abort()
		return
	}
	c.Next()
}

func RequirePlatform(c *gin.Context) {
	cl, ok := ClaimsFrom(c)
	if !ok || (cl.TokenType != "platform" && cl.Role != "super_user") {
		response.Forbidden(c)
		c.Abort()
		return
	}
	c.Next()
}

func RequireRoles(roles ...string) gin.HandlerFunc {
	allowed := map[string]struct{}{}
	for _, r := range roles {
		allowed[r] = struct{}{}
	}
	return func(c *gin.Context) {
		cl, ok := ClaimsFrom(c)
		if !ok {
			response.Unauthorized(c, "not authenticated")
			c.Abort()
			return
		}
		if cl.Role == "admin" || cl.Role == "super_user" {
			c.Next()
			return
		}
		if _, ok := allowed[cl.Role]; !ok {
			response.Forbidden(c)
			c.Abort()
			return
		}
		c.Next()
	}
}

func TenantUUID(c *gin.Context) (uuid.UUID, error) {
	cl, _ := ClaimsFrom(c)
	return uuid.Parse(cl.TenantID)
}

func CORS(origins []string) gin.HandlerFunc {
	allowed := map[string]struct{}{}
	for _, o := range origins {
		allowed[o] = struct{}{}
	}
	return func(c *gin.Context) {
		origin := c.GetHeader("Origin")
		if _, ok := allowed[origin]; ok || origin == "" {
			if origin != "" {
				c.Header("Access-Control-Allow-Origin", origin)
			}
			c.Header("Access-Control-Allow-Credentials", "true")
			c.Header("Access-Control-Allow-Headers", "Authorization, Content-Type, X-Tenant-Subdomain")
			c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		}
		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}
		c.Next()
	}
}
