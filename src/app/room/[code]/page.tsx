import RoomClient from '@/components/RoomClient';

export default function RoomPage({ params }: { params: { code: string } }) {
  return <RoomClient roomCode={params.code.toUpperCase()} />;
}

export function generateMetadata({ params }: { params: { code: string } }) {
  return { title: `房间 ${params.code.toUpperCase()} · 共著` };
}