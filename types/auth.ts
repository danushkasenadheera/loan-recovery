export interface User {
  id: string
  userName: string
  bankCode: string
  userType: string
  authToken: string
}

export interface LoginCredentials {
  userName: string
  password: string
  bankCode: string
}

export interface LoginResponse {
  userName: string
  token: string
  bankCode: string
  role: number
  id?: string
}
