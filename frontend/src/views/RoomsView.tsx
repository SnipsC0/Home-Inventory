// import { useQuery } from '@tanstack/react-query';
// import { useAppStore } from '../store/useAppStore';
// import type { ApiService } from '../services/api';

// interface Props {
//   api: ApiService;
// }

// export default function RoomsView({ api }: Props) {
//   const setView = useAppStore((state) => state.setView);
//   const setSelectedRoom = useAppStore((state) => state.setSelectedRoom);

//   const {
//     data: rooms = [],
//     isLoading,
//     error,
//   } = useQuery({
//     queryKey: ['rooms'],
//     queryFn: () => api.getRooms(),
//   });

//   const { data: config } = useQuery({
//     queryKey: ['config'],
//     queryFn: () => api.getConfig(),
//   });

//   const handleRoomClick = (roomName: string) => {
//     setSelectedRoom(roomName);
//     setView('cupboards');
//   };

//   const handleAllItemsClick = () => {
//     setView('all-items');
//   };

//   if (isLoading) {
//     return <div>Se încarcă...</div>;
//   }

//   if (error) {
//     return (
//       <div style={{ color: 'var(--error-color)' }}>
//         Eroare la încărcarea camerelor
//       </div>
//     );
//   }

//   return (
//     <div>
//       {/* Header */}
//       <div
//         style={{
//           display: 'flex',
//           justifyContent: 'space-between',
//           alignItems: 'center',
//           marginBottom: '16px',
//           gap: '12px',
//           flexWrap: 'wrap',
//         }}
//       >
//         <h3 style={{ margin: 0 }}>🏠 Camerele din casă</h3>

//         <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
//           <button
//             onClick={handleAllItemsClick}
//             style={{
//               padding: '8px 16px',
//               background: 'var(--secondary-background-color)',
//               color: 'var(--primary-text-color)',
//               border: '1px solid var(--divider-color)',
//               borderRadius: '4px',
//               cursor: 'pointer',
//               fontWeight: 500,
//               display: 'flex',
//               alignItems: 'center',
//               gap: '6px',
//             }}
//           >
//             📦 Toate Obiectele
//           </button>

//           {config?.allow_structure_modification && (
//             <button
//               style={{
//                 padding: '8px 16px',
//                 background: 'var(--primary-color)',
//                 color: '#fff',
//                 border: 'none',
//                 borderRadius: '4px',
//                 cursor: 'pointer',
//                 fontWeight: 500,
//               }}
//             >
//               + Adaugă Cameră
//             </button>
//           )}
//         </div>
//       </div>

//       {/* Grid cu camere */}
//       <div
//         style={{
//           display: 'grid',
//           gridTemplateColumns:
//             'repeat(auto-fill, minmax(min(100%, 250px), 1fr))',
//           gap: '12px',
//         }}
//       >
//         {rooms.length === 0 ? (
//           <p
//             style={{
//               gridColumn: '1 / -1',
//               textAlign: 'center',
//               color: 'var(--secondary-text-color)',
//               padding: '40px',
//             }}
//           >
//             Nu există camere.{' '}
//             {config?.allow_structure_modification && 'Adaugă prima cameră!'}
//           </p>
//         ) : (
//           rooms.map((room) => (
//             <div
//               key={room.id}
//               style={{
//                 background: 'var(--card-background-color)',
//                 padding: '16px',
//                 borderRadius: '8px',
//                 boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
//               }}
//             >
//               <div
//                 onClick={() => handleRoomClick(room.name)}
//                 style={{
//                   cursor: 'pointer',
//                   padding: '12px',
//                   borderRadius: '6px',
//                   textAlign: 'center',
//                   transition: 'background 0.2s',
//                   marginBottom: '12px',
//                 }}
//                 onMouseEnter={(e) => {
//                   e.currentTarget.style.background =
//                     'var(--secondary-background-color)';
//                 }}
//                 onMouseLeave={(e) => {
//                   e.currentTarget.style.background = 'transparent';
//                 }}
//               >
//                 <div style={{ fontSize: '2.5em', marginBottom: '8px' }}>🏠</div>
//                 <div
//                   style={{
//                     fontWeight: 600,
//                     marginBottom: '8px',
//                     fontSize: '1.1em',
//                   }}
//                 >
//                   {room.name}
//                 </div>
//                 <div
//                   style={{ fontSize: '0.9em', color: 'var(--primary-color)' }}
//                 >
//                   {room.itemCount} obiecte
//                 </div>
//               </div>

//               {config?.allow_structure_modification && (
//                 <div style={{ display: 'flex', gap: '8px' }}>
//                   <button
//                     style={{
//                       flex: 1,
//                       padding: '8px',
//                       background: 'var(--primary-color)',
//                       color: '#fff',
//                       border: 'none',
//                       borderRadius: '4px',
//                       cursor: 'pointer',
//                       fontSize: '0.9em',
//                     }}
//                   >
//                     ✏️ Edit
//                   </button>
//                   <button
//                     style={{
//                       flex: 1,
//                       padding: '8px',
//                       background: 'var(--error-color)',
//                       color: '#fff',
//                       border: 'none',
//                       borderRadius: '4px',
//                       cursor: 'pointer',
//                       fontSize: '0.9em',
//                     }}
//                   >
//                     🗑️ Șterge
//                   </button>
//                 </div>
//               )}
//             </div>
//           ))
//         )}
//       </div>
//     </div>
//   );
// }

export default function RoomsView() {
  return <div style={{ color: 'red' }}>TEST ROOMS VIEW</div>;
}
