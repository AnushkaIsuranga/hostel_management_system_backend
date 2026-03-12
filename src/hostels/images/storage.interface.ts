export interface StoredImageResult {
  imageUrl: string;
  contentType: string;
  fileSize: number;
  storedFileName: string;
}

export interface StorageService {
  /**
   * Upload an image file
   * @param file Multer file object
   * @param hostelId ID of the hostel
   * @returns Storage result with URL and metadata
   */
  uploadImage(file: Express.Multer.File, hostelId: string): Promise<StoredImageResult>;

  /**
   * Delete an image by its URL
   * @param imageUrl Full URL or relative path of the image
   * @returns True if deletion was successful, false otherwise
   */
  deleteImage(imageUrl: string): Promise<boolean>;
}
