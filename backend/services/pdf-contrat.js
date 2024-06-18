const fs = require("fs");
const PDFDocument = require("pdfkit");

function buildPDFContratVoiture(
  dataCallback,
  endCallback,
  errorCallback,
  contratDataCombined
) {
  try {
    const doc = new PDFDocument({ bufferPages: true, font: "Courier-Bold" });

    doc.on("data", (chunk) => {
      dataCallback(chunk);
    });

    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;

    const imagePath = "services/Model-PDF/test.png";
    const imageBuffer = fs.readFileSync(imagePath);

    doc.image(imageBuffer, 0, 0, {
      width: pageWidth,
      height: pageHeight,
    });

    const textSize = 10;
    const textCenterX = pageWidth / 2;

    function addText(text, x, y) {
      doc.fontSize(textSize).text(text, x, y, { align: "center" });
    }

    addText(`${contratDataCombined.contratId}`, textCenterX - 750, 297);
    addText(`${contratDataCombined.matriculeVoiture}`, textCenterX - 410, 297);
    addText(`${contratDataCombined.NomCondu1}`, textCenterX - 950, 310);
    addText(`${contratDataCombined.PrenomCondu1}`, textCenterX - 460, 310);
    addText(`${contratDataCombined.DateDeNaiCondu1}`, textCenterX - 320, 401);
    addText(`${contratDataCombined.AdresseCondu1}`, textCenterX - 950, 322);
    addText(`${contratDataCombined.NumTelCondu1}`, textCenterX - 460, 322);
    addText(`${contratDataCombined.NumPermisCondu1}`, textCenterX - 920, 436);
    addText(
      `${contratDataCombined.DelivrePermisCondu1}`,
      textCenterX - 420,
      436
    );
    addText(
      `${contratDataCombined.TypeIdentityCondu1}`,
      textCenterX - 740,
      449
    );
    addText(`${contratDataCombined.NumCinPassCondu1}`, textCenterX - 240, 550);
    addText(
      `${contratDataCombined.DelivreCinPassCondu1}`,
      textCenterX - 840,
      575
    );
    addText(`${contratDataCombined.DateDepContrat}`, textCenterX - 720, 600);
    addText(`${contratDataCombined.LieuDepContrat}`, textCenterX - 720, 600);
    addText(`${contratDataCombined.DateFinContrat}`, textCenterX - 720, 600);
    addText(`${contratDataCombined.LieuFinContrat}`, textCenterX - 720, 600);
    addText(`${contratDataCombined.TypePaie}`, textCenterX - 720, 600);
    addText(`${contratDataCombined.NumCheque}`, textCenterX - 720, 600);
    addText(`${contratDataCombined.TVAContrat}`, textCenterX - 720, 600);

    doc.on("end", () => {
      endCallback();
    });

    doc.end();
  } catch (error) {
    errorCallback(error);
  }
}



function buildPDFFactureVoiture(
  dataCallback,
  endCallback,
  errorCallback,
  factureDataCombined
) {
  try {
    const doc = new PDFDocument({ bufferPages: true, font: "Courier-Bold" });

    doc.on("data", (chunk) => {
      dataCallback(chunk);
    });

    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;

    const imagePath = "services/Model-PDF/test.png";
    const imageBuffer = fs.readFileSync(imagePath);

    doc.image(imageBuffer, 0, 0, {
      width: pageWidth,
      height: pageHeight,
    });

    const textSize = 10;
    const textCenterX = pageWidth / 2;

    function addText(text, x, y) {
      doc.fontSize(textSize).text(text, x, y, { align: "center" });
    }

    addText(`${factureDataCombined.contratId}`, textCenterX - 750, 297);
    addText(`${factureDataCombined.factureId}`, textCenterX - 650, 197);
    addText(`${factureDataCombined.matriculeVoiture}`, textCenterX - 410, 297);
    addText(`${factureDataCombined.NomCondu1}`, textCenterX - 950, 310);
    addText(`${factureDataCombined.PrenomCondu1}`, textCenterX - 460, 310);
    addText(`${factureDataCombined.AdresseCondu1}`, textCenterX - 950, 322);
    addText(`${factureDataCombined.NumTelCondu1}`, textCenterX - 460, 322);
    addText(`${factureDataCombined.totalPrix}`, textCenterX - 720, 600);
    addText(`${factureDataCombined.totalPrixTVA}`, textCenterX - 720, 600);
    addText(`${factureDataCombined.totalDays}`, textCenterX - 720, 600);
    addText(`${factureDataCombined.TVA}`, textCenterX - 720, 600);
    
    addText(`${factureDataCombined.DateDepContrat}`, textCenterX - 720, 600);
    addText(`${factureDataCombined.LieuDepContrat}`, textCenterX - 720, 600);
    addText(`${factureDataCombined.DateFinContrat}`, textCenterX - 720, 600);
    addText(`${factureDataCombined.LieuFinContrat}`, textCenterX - 720, 600);
    addText(`${factureDataCombined.TypePaie}`, textCenterX - 720, 600);
    addText(`${factureDataCombined.NumCheque}`, textCenterX - 720, 600);
    addText(`${factureDataCombined.TVAContrat}`, textCenterX - 720, 600);
  

    doc.on("end", () => {
      endCallback();
    });

    doc.end();
  } catch (error) {
    errorCallback(error);
  }
}

module.exports = { buildPDFContratVoiture, buildPDFFactureVoiture };
