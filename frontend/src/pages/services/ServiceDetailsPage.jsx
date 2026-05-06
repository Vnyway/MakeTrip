import { useParams } from 'react-router-dom';
import { PageShell } from '../../components/ui/PageShell';

export function ServiceDetailsPage() {
  const { id } = useParams();

  return <PageShell title={`Service ${id}`} description="Service details route shell." />;
}
