import { Suspense, lazy } from "react";
import { Routes, Route } from "react-router-dom";

import { Layout } from "@/components/Layout";
import { Landing } from "@/pages/Landing";
import { PageLoader } from "@/components/PageLoader";

const Dashboard = lazy(() =>
  import("@/pages/Dashboard").then((m) => ({ default: m.Dashboard })),
);
const CreateCircle = lazy(() =>
  import("@/pages/CreateCircle").then((m) => ({ default: m.CreateCircle })),
);
const CircleDetail = lazy(() =>
  import("@/pages/CircleDetail").then((m) => ({ default: m.CircleDetail })),
);
const NotFound = lazy(() =>
  import("@/pages/NotFound").then((m) => ({ default: m.NotFound })),
);

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Landing />} />
        <Route
          path="app"
          element={
            <Suspense fallback={<PageLoader />}>
              <Dashboard />
            </Suspense>
          }
        />
        <Route
          path="app/create"
          element={
            <Suspense fallback={<PageLoader />}>
              <CreateCircle />
            </Suspense>
          }
        />
        <Route
          path="app/circle/:id"
          element={
            <Suspense fallback={<PageLoader />}>
              <CircleDetail />
            </Suspense>
          }
        />
        <Route
          path="*"
          element={
            <Suspense fallback={<PageLoader />}>
              <NotFound />
            </Suspense>
          }
        />
      </Route>
    </Routes>
  );
}
