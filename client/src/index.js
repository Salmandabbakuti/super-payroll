import React from "react";
import { createRoot } from "react-dom/client";
import { TourProvider } from '@reactour/tour';

import App from "./App";

const root = createRoot(document.getElementById("root"));

const steps = [
  {
    selector: '.notification-bell',
    content: 'Click here to see your notifications',
  },
  {
    selector: ".new-post-card-container",
    content: "Click here to create new stream",
  },
  {
    selector: ".table_grid",
    content: "All your streams will appear here",
  },
  {
    selector: ".edit_stream",
    content: "Click here to edit your stream",
  },
  {
    selector: ".delete_stream",
    content: "Click here to delete your stream",
  }
];

const beforeClose = () => localStorage.setItem('product_tour', false);

root.render(
  <React.StrictMode>
    <TourProvider
      steps={steps}
      showPrevNextButtons
      showNavigation
      showBadge
      beforeClose={beforeClose}
    >
      <App />
    </TourProvider>
  </React.StrictMode>
);
