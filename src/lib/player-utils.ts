// Utility functions for handling player data transformations

export interface PlayerData {
  id: string
  tenantId: string
  firstName: string
  lastName: string
  dateOfBirth?: Date | null
  nationality?: string | null
  position?: string | null
  club?: string | null
  height?: number | null
  notes?: string | null
  tags: string[]
  rating?: number | null
  avatarUrl?: string | null
  createdAt: Date
  updatedAt: Date
}

export interface EnhancedPlayer extends Omit<PlayerData, 'position' | 'tags'> {
  positions: string[]
  avatarUrl?: string
  tags: string[]
}

/**
 * Transform database player data to enhanced player with positions array and avatar URL
 */
export function transformDatabasePlayer(dbPlayer: PlayerData): EnhancedPlayer {
  // For backward compatibility, check both avatarUrl field and tags
  let avatarUrl = dbPlayer.avatarUrl || undefined

  // Ensure tags is always an array to prevent crashes
  const tags = Array.isArray(dbPlayer.tags) ? dbPlayer.tags : []

  // If no avatarUrl field, extract from tags (for existing data)
  if (!avatarUrl && tags.length > 0) {
    const avatarTag = tags.find(tag => tag && tag.startsWith('avatar:'))
    avatarUrl = avatarTag ? avatarTag.replace('avatar:', '') : undefined
  }

  // Remove avatar tags from regular tags (cleanup)
  const regularTags = tags.filter(tag => tag && !tag.startsWith('avatar:'))

  // Convert position string to positions array
  const positions = dbPlayer.position
    ? dbPlayer.position.split(', ').map(p => p.trim()).filter(p => p.length > 0)
    : []

  return {
    ...dbPlayer,
    positions,
    avatarUrl,
    tags: regularTags
  }
}

/**
 * Transform enhanced player data back to database format
 * Note: Excludes auto-generated fields (id, timestamps) for create operations
 */
export function transformToDatabase(player: Partial<EnhancedPlayer>): Partial<PlayerData> {
  const { positions, avatarUrl, tags = [], id, createdAt, updatedAt, tenantId, ...rest } = player

  // Create clean payload without auto-generated fields
  const cleanData = {
    ...rest,
    position: positions && positions.length > 0 ? positions.join(', ') : null,
    avatarUrl: avatarUrl || null, // Store avatar URL in proper field
    tags: tags || [] // Ensure tags is always an array
  }

  // Only include non-auto-generated fields
  return cleanData
}

/**
 * Get avatar URL from player tags
 */
export function getAvatarUrl(tags: string[]): string | undefined {
  const avatarTag = tags.find(tag => tag.startsWith('avatar:'))
  return avatarTag ? avatarTag.replace('avatar:', '') : undefined
}

/**
 * Get positions array from position string
 */
export function getPositionsArray(position: string | null | undefined): string[] {
  if (!position) return []
  return position.split(', ').map(p => p.trim()).filter(p => p.length > 0)
}