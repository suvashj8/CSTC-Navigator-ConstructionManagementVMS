package auth

import (
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/navigator/vms/internal/middleware"
)

type LoginUser struct {
	ID           string   `json:"id"`
	Name         string   `json:"name"`
	Email        string   `json:"email"`
	Role         string   `json:"role"`
	LocationIDs  []string `json:"location_ids"`
	TenantID     string   `json:"tenant_id,omitempty"`
	TenantName   string   `json:"tenant_name,omitempty"`
}

type LoginResponse struct {
	AccessToken string    `json:"access_token"`
	ExpiresIn   int       `json:"expires_in"`
	User        LoginUser `json:"user"`
}

func SignTenant(secret string, exp time.Duration, userID uuid.UUID, email, name, role, tenantID, tenantName string, locIDs []string) (LoginResponse, error) {
	ids := locIDs
	if ids == nil {
		ids = []string{}
	}
	claims := &middleware.Claims{
		Sub:         userID.String(),
		Email:       email,
		Role:        role,
		TenantID:    tenantID,
		TenantName:  tenantName,
		LocationIDs: ids,
		TokenType:   "tenant",
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(exp)),
		},
	}
	tok := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	s, err := tok.SignedString([]byte(secret))
	if err != nil {
		return LoginResponse{}, err
	}
	return LoginResponse{
		AccessToken: s,
		ExpiresIn:   int(exp.Seconds()),
		User: LoginUser{
			ID: userID.String(), Name: name, Email: email, Role: role,
			LocationIDs: ids, TenantID: tenantID, TenantName: tenantName,
		},
	}, nil
}

func SignPlatform(secret string, userID uuid.UUID, email, name string) (LoginResponse, error) {
	exp := 8 * time.Hour
	claims := &middleware.Claims{
		Sub: email, Email: email, Role: "super_user", TokenType: "platform",
		RegisteredClaims: jwt.RegisteredClaims{
			Subject: userID.String(), ExpiresAt: jwt.NewNumericDate(time.Now().Add(exp)),
		},
	}
	tok := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	s, err := tok.SignedString([]byte(secret))
	if err != nil {
		return LoginResponse{}, err
	}
	return LoginResponse{
		AccessToken: s,
		ExpiresIn:   int(exp.Seconds()),
		User:        LoginUser{ID: userID.String(), Name: name, Email: email, Role: "super_user", LocationIDs: []string{}},
	}, nil
}

func SignImpersonation(secret string, exp time.Duration, superID uuid.UUID, user LoginUser) (LoginResponse, error) {
	claims := &middleware.Claims{
		Sub: user.ID, Email: user.Email, Role: "super_user",
		TenantID: user.TenantID, TenantName: user.TenantName, LocationIDs: user.LocationIDs,
		TokenType: "tenant", Impersonated: superID.String(),
		RegisteredClaims: jwt.RegisteredClaims{ExpiresAt: jwt.NewNumericDate(time.Now().Add(exp))},
	}
	tok := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	s, err := tok.SignedString([]byte(secret))
	if err != nil {
		return LoginResponse{}, err
	}
	user.Role = "super_user"
	return LoginResponse{AccessToken: s, ExpiresIn: int(exp.Seconds()), User: user}, nil
}
