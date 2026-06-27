/**
 * Type definitions for the Vitrion Smart Display digital signage platform.
 */

export type AssetType = 'image' | 'video' | 'web' | 'text';

export interface AssetConfig {
  backgroundColor?: string;
  textColor?: string;
  fontSize?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
  fontFamily?: 'sans' | 'serif' | 'mono';
  textAlign?: 'left' | 'center' | 'right';
  scrollSpeed?: 'none' | 'slow' | 'medium' | 'fast';
}

export interface Asset {
  id: string;
  name: string;
  type: AssetType;
  url: string; // For images, videos, and embedded web apps
  content: string; // Scrolling ticker message or custom text content for screens
  config: AssetConfig;
  duration: number; // Default display length in seconds
  ownerId: string;
  clientId?: string; // Associated client for separating/filtering assets
  createdAt: any; // Firestore Timestamp
  updatedAt: any; // Firestore Timestamp
}

export interface PlaylistItem {
  assetId: string;
  name: string;
  type: AssetType;
  url: string;
  content: string;
  config: AssetConfig;
  duration: number;
}

export interface Playlist {
  id: string;
  name: string;
  items: PlaylistItem[];
  ownerId: string;
  clientId?: string; // Reference to the registered Client document ID
  schedule?: Record<string, DaySchedule>; // Weekly schedule config
  createdAt: any; // Firestore Timestamp
  updatedAt: any; // Firestore Timestamp
}

export interface DaySchedule {
  enabled: boolean;
  startTime: string; // Hour in 'HH:MM' format
  endTime: string;   // Hour in 'HH:MM' format
}

export type WeeklySchedule = Record<string, DaySchedule>;

export interface Screen {
  id: string; // Unique pairing code (e.g., 'BG4D')
  name: string; // Name assigned by user, e.g. "Painel Loja"
  pairingCode: string; // Monospace easy code
  status: 'online' | 'offline';
  lastActive: any; // Last heartbeat timestamp
  contentType: 'playlist' | 'asset' | 'idle' | 'standby' | 'stopped';
  contentId: string; // Reference to Playlist or Asset Document ID
  pairedAt: any; // Firestore Timestamp or null
  ownerId: string; // User UID after pairing, empty string when pending pairing
  clientId?: string; // Reference to the registered Client document ID
  createdAt: any; // Firestore Timestamp
  updatedAt: any; // Firestore Timestamp
  schedule?: WeeklySchedule;
  deviceTime?: number; // Device local epoch time in ms
}

export interface Client {
  id: string; // Unique id
  establishmentName: string; // Nome do Estabelecimento
  phone: string; // Telefone
  whatsapp: string; // Outro telefone de WhatsApp
  username: string; // Usuário
  password?: string; // Senha
  email: string; // Email
  address: string; // Endereço do estabelecimento
  city: string; // Cidade
  state: string; // Estado
  cep?: string; // CEP (ZIP Code)
  planId?: string; // Reference to the active Pricing Plan ID
  vencimento?: string; // Expiration Date (e.g., DD/MM/AAAA)
  ownerId: string; // Which admin created this client
  orderIndex?: number; // Sorting sort sequence order for rows
  createdAt: any; // Firestore Timestamp
  updatedAt: any; // Firestore Timestamp
}

