export interface EmptySuccessResponse {
  success: true;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
  };
}

export interface SignInPayload {
  email: string;
  password: string;
}

export interface SignInResponse {
  success: true;
  data: {
    AccessToken?: string;
    RefreshToken?: string;
    ExpiresIn?: number;
    TokenType?: string;
  };
}

export interface SignUpPayload {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface ConfirmSignUpPayload {
  email: string;
  code: string;
}

export interface ForgotPasswordPayload {
  email: string;
}

export interface ConfirmForgotPasswordPayload {
  email: string;
  code: string;
  newPassword: string;
}

export interface RefreshPayload {
  refreshToken: string;
}

export interface RefreshResponse {
  success: true;
  data: {
    AccessToken?: string;
    RefreshToken?: string;
    ExpiresIn?: number;
    TokenType?: string;
  };
}

export interface JwtPayload {
  sub: string;
  email?: string;
  given_name?: string;
  family_name?: string;
  exp?: number;
  iat?: number;
  [key: string]: unknown;
}
