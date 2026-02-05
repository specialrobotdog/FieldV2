export type Field = {
  id: string
  name: string
  imageIds: string[]
  createdAt: number
}

export type ImageItem = {
  id: string
  fieldId: string
  src: string
  createdAt: number
  note?: string
}

export type FieldState = {
  fields: Field[]
  images: ImageItem[]
}
