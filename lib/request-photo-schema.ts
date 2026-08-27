export function isRequestPhotoSchemaMismatch(error: unknown) {
  const message = error instanceof Error ? error.message : String(error)

  return [
    "P2021",
    "P2022",
    "TableDoesNotExist",
    "ColumnNotFound",
    "RequestPhoto",
    "does not exist in the current database",
  ].some((pattern) => message.includes(pattern))
}

export async function withRequestPhotoFallback<T>(
  withPhotos: () => Promise<T>,
  withoutPhotos: () => Promise<T>
) {
  try {
    return await withPhotos()
  } catch (error) {
    if (!isRequestPhotoSchemaMismatch(error)) {
      throw error
    }

    return withoutPhotos()
  }
}
