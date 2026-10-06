export type Blog = {
  id: number;
  author_id: number;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
};

export type BlogInput = {
  title: string;
  content: string;
};

export type RegisterInput = {
  username: string;
  password: string;
  email: string;
};

export type TokenResponse = {
  access_token: string;
  token_type: string;
};
