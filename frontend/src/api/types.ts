export interface Credentials {
  email: string
  password: string
}

export interface UserResponse {
  id: string
  email: string
  createdAt: string
}

export interface LoginResponse {
  accessToken: string
  expiresAt: string
}

export interface FieldError {
  field: string
  message: string
}
