import { VideoItem } from '../types';

// Using open source sample videos for the demo to ensure playback works without Auth issues.
// UPDATED to HTTPS to avoid Mixed Content blocking.
export const MOCK_VIDEOS: VideoItem[] = [
  {
    id: '1',
    title: 'El Gran Conejo (Big Buck Bunny)',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    thumbnail: 'https://picsum.photos/400/300?random=1'
  },
  {
    id: '2',
    title: 'Sueño de Elefantes',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
    thumbnail: 'https://picsum.photos/400/300?random=2'
  },
  {
    id: '3',
    title: 'Llamas Gigantes',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    thumbnail: 'https://picsum.photos/400/300?random=3'
  },
  {
    id: '4',
    title: 'El Gran Escape',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
    thumbnail: 'https://picsum.photos/400/300?random=4'
  },
  {
    id: '5',
    title: 'Diversión a lo Grande',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
    thumbnail: 'https://picsum.photos/400/300?random=5'
  },
  {
    id: '6',
    title: 'Paseo de la Alegría',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
    thumbnail: 'https://picsum.photos/400/300?random=6'
  },
  {
    id: '7',
    title: 'Colapso Total',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4',
    thumbnail: 'https://picsum.photos/400/300?random=7'
  },
  {
    id: '8',
    title: 'Sintel: La Búsqueda',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
    thumbnail: 'https://picsum.photos/400/300?random=8'
  },
  {
    id: '9',
    title: 'Aventura en Subaru',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackOnStreetAndDirt.mp4',
    thumbnail: 'https://picsum.photos/400/300?random=9'
  },
  {
    id: '10',
    title: 'Lágrimas de Acero',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
    thumbnail: 'https://picsum.photos/400/300?random=10'
  }
];