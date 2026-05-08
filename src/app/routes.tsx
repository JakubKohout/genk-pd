import { createHashRouter } from 'react-router-dom';
import { AppLayout } from './AppLayout';
import { HomePage } from './HomePage';
import { CodesPage } from '@/modules/codes/components/CodesPage';
import { ModeWrite } from '@/modules/codes/components/ModeWrite';
import { ModeChoose } from '@/modules/codes/components/ModeChoose';
import { LawsIndex } from '@/modules/laws/components/LawsIndex';
import { LeaQuizPage } from '@/modules/laws/lea/components/LeaQuizPage';
import { PenalLayout } from '@/modules/laws/penal/components/PenalLayout';
import { PenalScenarioPage } from '@/modules/laws/penal/components/PenalScenarioPage';
import { PenalRecallPage } from '@/modules/laws/penal/components/PenalRecallPage';
import { ComingSoonPage } from './ComingSoonPage';

export const router = createHashRouter([
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
      { path: 'laws', element: <LawsIndex /> },
      { path: 'laws/lea', element: <LeaQuizPage /> },
      {
        path: 'laws/penal',
        element: <PenalLayout />,
        children: [
          { index: true, element: <PenalScenarioPage /> },
          { path: 'scenarios', element: <PenalScenarioPage /> },
          { path: 'recall', element: <PenalRecallPage /> },
        ],
      },
      { path: 'sasp', element: <ComingSoonPage title="SASP příručka" /> },
    ],
  },
]);
