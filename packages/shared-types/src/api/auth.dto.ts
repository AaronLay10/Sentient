export interface LoginDto {
  email: string;
  password: string;
}

export interface RegisterDto {
  email: string;
  password: string;
  name: string;
  tenant_id?: string;
}

export interface AuthResponseDto {
  access_token: string;
  refresh_token?: string;
  user: UserDto;
}

export interface UserDto {
  id: string;
  email: string;
  name: string;
  tenant_id?: string;
  role: string;
  created_at: Date;
}

export interface RefreshTokenDto {
  refresh_token: string;
}
