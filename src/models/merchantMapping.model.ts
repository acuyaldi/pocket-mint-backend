// Payload untuk membuat merchant mapping (POST /api/v1/merchant-mappings)
export interface CreateMerchantMappingDto {
  merchantName: string;
  categoryId: string;
}

// Payload untuk memperbarui merchant mapping (PATCH /api/v1/merchant-mappings/:id)
export interface UpdateMerchantMappingDto {
  merchantName?: string;
  categoryId?: string;
}
