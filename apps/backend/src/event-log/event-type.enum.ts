export const EventType = {
  CAMINO_CREATED: 'camino_created',
  CAMINO_UPDATED: 'camino_updated',
  CAMINO_VOTED: 'camino_voted',
  CAMINO_IMAGE_UPLOADED: 'camino_image_uploaded',
  ACCOMMODATION_CREATED: 'accommodation_created',
  ACCOMMODATION_UPDATED: 'accommodation_updated',
  SIGHT_CREATED: 'sight_created',
  SIGHT_UPDATED: 'sight_updated',
  CAMINO_GPX_UPLOADED: 'camino_gpx_uploaded',
  CAMINO_GPX_DELETED: 'camino_gpx_deleted',
  WAYPOINT_COORDINATES_UPDATED: 'waypoint_coordinates_updated',
  WAYPOINT_UPDATED: 'waypoint_updated',
} as const;

export type EventType = (typeof EventType)[keyof typeof EventType];
