import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

/**
 * Exporte des données en format Excel (.xlsx)
 */
export const exportToExcel = (data: any[], fileName: string) => {
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Données');
    XLSX.writeFile(workbook, `${fileName}.xlsx`);
};

/**
 * Exporte un rapport structuré en PDF
 */
export const exportToPDF = (
    title: string,
    columns: string[],
    rows: any[][],
    fileName: string,
    summary?: { label: string; value: string }[]
) => {
    const doc = new jsPDF();

    // --- Header / Branding ---
    // Un petit logo minimaliste (Deux carrés superposés)
    doc.setFillColor(201, 116, 35); // Ambre
    doc.rect(14, 10, 8, 8, 'F');
    doc.setFillColor(24, 24, 27); // Zinc-900
    doc.rect(18, 14, 8, 8, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(24, 24, 27);
    doc.text('BTP INTELLIGENCE', 30, 16);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text('Management & Solutions BTP', 30, 20);

    // Titre de la page
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.setTextColor(0);
    doc.text(title, 14, 40);

    // Date et ID
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text(`Rapport généré le: ${new Date().toLocaleString()}`, 14, 48);
    
    // Ligne de séparation
    doc.setDrawColor(230);
    doc.line(14, 52, 196, 52);

    // --- Résumé (Dashboard style) ---
    let summaryYEnd = 52;
    if (summary && summary.length > 0) {
        let yPos = 62;
        doc.setFontSize(10);
        
        // On dessine un petit fond gris clair pour le résumé
        doc.setFillColor(250, 250, 249);
        doc.roundedRect(14, 56, 182, (summary.length * 8) + 4, 3, 3, 'F');

        summary.forEach((item) => {
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(100);
            doc.text(`${item.label}:`, 20, yPos);
            
            // Correction puissante pour tous les types d'espaces générés par toLocaleString() (ex: \u202f)
            const cleanValue = item.value.replace(/[\s\u00a0\u202f\u200b]/g, ' ');
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(24, 24, 27);
            doc.text(cleanValue, 65, yPos); // Colonne de droite pour les valeurs
            yPos += 8;
        });
        summaryYEnd = yPos + 2;
    }

    // --- Tableau ---
    autoTable(doc, {
        startY: summaryYEnd + 5,
        head: [columns],
        body: rows.map(row => row.map(cell => typeof cell === 'string' ? cell.replace(/[\s\u00a0\u202f\u200b]/g, ' ') : cell)),
        theme: 'grid',
        headStyles: { 
            fillColor: [24, 24, 27], // Fond noir pro
            textColor: [255, 255, 255],
            fontSize: 10,
            fontStyle: 'bold',
            halign: 'center'
        },
        styles: { 
            fontSize: 9, 
            cellPadding: 4,
            lineColor: [230, 230, 230],
            lineWidth: 0.1
        },
        alternateRowStyles: {
            fillColor: [252, 252, 251]
        },
        margin: { left: 14, right: 14 }
    });

    // --- Pied de page ---
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        
        // Ligne au dessus du footer
        doc.setDrawColor(240);
        doc.line(14, doc.internal.pageSize.getHeight() - 15, 196, doc.internal.pageSize.getHeight() - 15);
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(
            `Page ${i} sur ${pageCount} - Document généré par BTP Intelligence Manager`,
            doc.internal.pageSize.getWidth() / 2,
            doc.internal.pageSize.getHeight() - 10,
            { align: 'center' }
        );
    }

    doc.save(`${fileName}.pdf`);
};
