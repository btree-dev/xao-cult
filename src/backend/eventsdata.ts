/**
 * Event Mock Data
 *
 * Add new events here and they will automatically appear on the dashboard!
 * The system uses real-time protocols to update the UI automatically.
 */

export const EventDocs = [
  {
    id: 'rivo-event-1',
    title: 'Rivo Open Air',
    artist: 'rivo',
    tag: 'Les Déferlantes 2025',
    location: 'Wembley Stadium, London',
    date: 'Sat, 19 December 2027',
    image: 'https://images.unsplash.com/photo-1583244532610-2a234e7c3eca?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    profilePic: '/rivo-profile-pic.svg',
    likes: 12400000,  
    Shares: 1347,
    genre: 'Electronic'
  },
  {
    id: 'xao-event-1',
    title: 'XAO PRESENTS',
    artist: 'xao',
    tag: 'Les Déferlantes 2025',
    location: 'Madison Square Garden, New York',
    date: 'Fri, 25 December 2026',
    image: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1740&q=80',
    profilePic: '/xao-profile.svg',
    likes: 8200000,  
    Shares: 982,
    genre: 'Punk',
  },

  {
    id: 'edm-event-1',
    title: 'NEON.BLK FESTIVAL',
    artist: 'neonblk',
    tag: 'Les Déferlantes 2025',
    location: 'Electric Brixton, London',
    date: 'Sun, 27 December 2026',
    image: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1740&q=80',
    profilePic: '/rivo-profile-pic.svg',
    likes: 5700000,  
    Shares: 743,
    genre: 'Rock',
  },
  {
  id: 'sse-test-event',
  title: 'SSE TEST',
  artist: 'test_sse',
  tag: 'Real-time Test',
  location: 'Test Arena, Silicon Valley',
  date: 'Mon, 28 December 2026',
  image: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819',
  profilePic: '/xao-profile.svg',
  likes: 9999,
  Shares: 111,
  genre: 'Blues'
},
{
  id: 'techno-night-2025',
  title: 'TECHNO UNDERGROUND',
  artist: 'djvortex',
  tag: 'Berlin Warehouse 2025',
  location: 'Berghain, Berlin',
  date: 'Sat, 2 January 2027',
  image: 'https://images.unsplash.com/photo-1506157786151-b8491531f063?w=2070&auto=format',
  profilePic: '/xao-profile.svg',
  likes: 3400000,  // 3.4M likes
  Shares: 1523,
  genre:'Metal',
},
{
  id: 'jazz-lounge-session',
  title: 'MIDNIGHT JAZZ',
  artist: 'smoothjazz_official',
  tag: 'Blue Note Sessions 2025',
  location: 'Blue Note Jazz Club, Tokyo',
  date: 'Wed, 5 January 2027',
  image: 'https://images.unsplash.com/photo-1415201364774-f6f0bb35f28f?w=2070&auto=format',
  profilePic: '/xao-profile.svg',
  likes: 1200000,  // 1.2M likes
  Shares: 456,
  genre: 'Jazz',
},


];

/**
 * HOW TO ADD A NEW EVENT:
 *
 * Just add a new object to the EventDocs array above, like this:
 *
 * {
 *   id: 'unique-event-id',           // Must be unique!
 *   title: 'Event Title',             // Show on card
 *   artist: 'artist-username',        // Artist name
 *   tag: 'Event Category/Festival',   // Tag/category
 *   image: 'https://...',             // Event image URL
 *   profilePic: '/path-to-pic.svg',   // Artist profile pic
 *   likes: 1000,                      // Number of likes (use numbers, not strings)
 *   Shares: 500                        // Number of Shares (use numbers, not strings)
 * }
 *
 * After adding, the dashboard will show it automatically!
 * - With polling: Updates in 30 seconds max
 * - With WebSocket: Updates instantly
 */