/**
 * Renders a DOM node to a PDF.
 *
 * The crop/clipping bug came from feeding html2canvas's raw pixel
 * dimensions straight into jsPDF with unit: 'px'. jsPDF's 'px' unit
 * assumes 96 CSS px per inch, but PDF's native unit is points (72/inch) -
 * some viewers (mobile Chrome/Safari's built-in PDF preview especially)
 * don't reconcile that consistently and end up rendering/cropping the
 * page at the wrong physical size. Converting explicitly to points before
 * building the PDF makes the physical page size unambiguous everywhere.
 */
async function renderElementToPdf(element: HTMLElement) {
  const html2canvas = (await import('html2canvas')).default;
  const { jsPDF } = await import('jspdf');

  const canvas = await html2canvas(element, {
    scale: 2,
    backgroundColor: '#ffffff',
  });

  const PX_TO_PT = 72 / 96;
  // canvas is 2x scaled for crispness; divide back out before converting.
  const widthPt = (canvas.width / 2) * PX_TO_PT;
  const heightPt = (canvas.height / 2) * PX_TO_PT;

  const pdf = new jsPDF({
    unit: 'pt',
    format: [widthPt, heightPt],
  });

  const imgData = canvas.toDataURL('image/png');
  pdf.addImage(imgData, 'PNG', 0, 0, widthPt, heightPt);
  return pdf;
}

export async function downloadElementAsPdf(element: HTMLElement, filename: string) {
  const pdf = await renderElementToPdf(element);
  pdf.save(filename);
}

/** Same rendering, but returns a Blob instead of triggering a download -
 * used to bundle multiple PDFs into a single ZIP. */
export async function elementToPdfBlob(element: HTMLElement): Promise<Blob> {
  const pdf = await renderElementToPdf(element);
  return pdf.output('blob');
}
