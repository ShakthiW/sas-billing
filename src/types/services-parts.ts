// Types for Custom Services and Parts Management

export interface CustomService {
  _id?: string;
  serviceId: string;
  name: string;
  description?: string;
  category?: string; // e.g., "AC Service", "Maintenance", "Repair"
  estimatedDuration?: number; // in minutes
  defaultPrice?: number;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  createdBy?: string; // User ID who created
  tags?: string[]; // for search/filtering
}

export interface CustomPart {
  _id?: string;
  partId: string;
  name: string;
  brand: string;
  category?: string; // e.g., "Battery", "Filter", "Oil"
  partNumber?: string; // Manufacturer part number
  description?: string;
  defaultPrice?: number;
  stockQuantity?: number;
  minStockLevel?: number;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  createdBy?: string;
  tags?: string[]; // for search/filtering
}

export interface ServiceCategory {
  _id?: string;
  categoryId: string;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt?: Date;
}

export interface PartBrand {
  _id?: string;
  brandId: string;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt?: Date;
}