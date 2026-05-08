export interface Member {
  id: number;
  name: string;
  brand: string;
  gen: string;
  team: string;
  profile_image_url: string | null;
  graduated_at: string | null;
  created_at: string;
}

export interface EventData {
  id: number;
  date: string;
  end_date: string | null;
  title: string;
  location: string | null;
  link: string;
  image_url: string | null;
  live: string | null;
  image_urls: any | null; // jsonb
  image_path: string | null;
  updated_at: string;
}
