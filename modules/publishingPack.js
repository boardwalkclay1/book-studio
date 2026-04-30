export default function publishingPack() {
  const year = new Date().getFullYear();
  const copyrightBox = document.getElementById("pubCopyright");
  const isbnBox = document.getElementById("pubIsbn");
  const dedicationBox = document.getElementById("pubDedication");
  const ackBox = document.getElementById("pubAcknowledgments");
  const blurbBox = document.getElementById("pubBlurb");

  copyrightBox.value =
`Copyright © ${year} [Your Name or Imprint]
All rights reserved. No part of this book may be reproduced in any form without written permission, except for brief quotations in reviews or critical articles.`;

  isbnBox.value =
`ISBN: [Your ISBN here]
Printed in [Country]`;

  dedicationBox.value =
`For ____________________________,
who ____________________________.`;

  ackBox.value =
`Thank you to ____________________________ 
for their support, patience, and belief in this story.`;

  blurbBox.value =
`In a world where ____________________________,
one person must ____________________________ 
before ____________________________ happens.

Perfect for readers who love ____________________________ and ____________________________.`;

  // Simple copy buttons (if present)
  document.querySelectorAll("[data-copy-target]").forEach(btn => {
    btn.onclick = () => {
      const id = btn.getAttribute("data-copy-target");
      const el = document.getElementById(id);
      if (!el) return;
      el.select();
      document.execCommand("copy");
      btn.textContent = "Copied";
      setTimeout(() => (btn.textContent = "Copy"), 1000);
    };
  });
}
