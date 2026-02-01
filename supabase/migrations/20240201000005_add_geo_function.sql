-- Create function to get events within radius
CREATE OR REPLACE FUNCTION get_events_within_radius(
  center_lat float8,
  center_lng float8,
  radius_km float8
)
RETURNS TABLE (
  id uuid,
  creator_id uuid,
  title text,
  description text,
  location json,
  privacy text,
  radius_meters int,
  expires_at timestamptz,
  is_boosted boolean,
  created_at timestamptz,
  dist_meters float8
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.id,
    e.creator_id,
    e.title,
    e.description,
    st_asgeojson(e.location)::json as location,
    e.privacy,
    e.radius_meters,
    e.expires_at,
    e.is_boosted,
    e.created_at,
    st_distance(
      e.location,
      st_point(center_lng, center_lat)::geography
    ) as dist_meters
  FROM
    events e
  WHERE
    st_dwithin(
      e.location,
      st_point(center_lng, center_lat)::geography,
      radius_km * 1000
    )
    AND e.expires_at > now()
  ORDER BY
    dist_meters;
END;
$$;
