import { useParams } from 'react-router-dom';
import { PageShell } from '../../components/ui/PageShell';

export function TourDetailsPage() {
  const { id } = useParams();

  return <PageShell title={`Tour ${id}`} description="Tour constructor details route shell." />;
}
