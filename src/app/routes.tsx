import { createBrowserRouter } from 'react-router-dom';
import { AppLayout } from './AppLayout';
import { HomePage } from './HomePage';
import { CodesPage } from '@/modules/codes/components/CodesPage';
import { ModeWrite } from '@/modules/codes/components/ModeWrite';
import { ModeChoose } from '@/modules/codes/components/ModeChoose';
import { ComingSoonPage } from './ComingSoonPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <HomePage /> },
      {
        path: 'codes',
        element: <CodesPage />,
        children: [
          { index: true, element: <ModeWrite /> },
          { path: 'write', element: <ModeWrite /> },
          { path: 'choose', element: <ModeChoose /> },
        ],
      },
      { path: 'laws', element: <ComingSoonPage title="Zákony" /> },
      { path: 'sasp', element: <ComingSoonPage title="SASP příručka" /> },
    ],
  },
]);
