import { createHashRouter, Navigate } from 'react-router-dom';
import { AppLayout } from './AppLayout';
import { HomePage } from './HomePage';
import { CodesPage } from '@/modules/codes/components/CodesPage';
import { ModeWrite } from '@/modules/codes/components/ModeWrite';
import { ModeChoose } from '@/modules/codes/components/ModeChoose';
import { LawPage } from '@/modules/law/components/LawPage';
import { GeoLayout } from '@/modules/geo/components/GeoLayout';
import { GeoBlindPage } from '@/modules/geo/components/GeoBlindPage';
import { GeoNamePage } from '@/modules/geo/components/GeoNamePage';
import { GeoCalibratePage } from '@/modules/geo/components/GeoCalibratePage';

export const routes = [
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
      { path: 'law', element: <LawPage /> },
      { path: 'penal/recall', element: <Navigate to="/law" replace /> },
      { path: 'laws', element: <Navigate to="/law" replace /> },
      { path: 'laws/lea', element: <Navigate to="/law" replace /> },
      { path: 'laws/penal/recall', element: <Navigate to="/law" replace /> },
      { path: 'laws/penal', element: <Navigate to="/law" replace /> },
      { path: 'laws/penal/scenarios', element: <Navigate to="/law" replace /> },
      { path: 'sasp', element: <Navigate to="/law" replace /> },
      {
        path: 'geo',
        element: <GeoLayout />,
        children: [
          { index: true, element: <GeoBlindPage /> },
          { path: 'blind', element: <GeoBlindPage /> },
          { path: 'name', element: <GeoNamePage /> },
        ],
      },
      { path: 'geo/calibrate', element: <GeoCalibratePage /> },
    ],
  },
];

export const router = createHashRouter(routes);
