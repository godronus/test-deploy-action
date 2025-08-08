interface Secret {
  id: number
  name: string
  comment: string
}

type AppSecrets = Record<
  string,
  Pick<Secret, 'id'> & Partial<Pick<Secret, 'name' | 'comment'>>
>

export type { AppSecrets }
