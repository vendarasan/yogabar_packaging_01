const fs = require('fs');
const path = require('path');
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  WidthType, AlignmentType, HeadingLevel, BorderStyle, ShadingType,
  PageNumber, Header, Footer
} = require('docx');

const { STAGE_DEFS, RACI_DATA, FUNCTIONS } = require('./constants');

async function buildDoc() {
  const primaryColor = '062A30'; // Dark Teal
  const accentColor = '0284C7';  // Blue / Teal
  const lightBg = 'F1F5F9';
  const tableBorderColor = 'CBD5E1';

  const cellBorder = {
    top: { style: BorderStyle.SINGLE, size: 1, color: tableBorderColor },
    bottom: { style: BorderStyle.SINGLE, size: 1, color: tableBorderColor },
    left: { style: BorderStyle.SINGLE, size: 1, color: tableBorderColor },
    right: { style: BorderStyle.SINGLE, size: 1, color: tableBorderColor }
  };

  const headerCellBorder = {
    top: { style: BorderStyle.SINGLE, size: 2, color: primaryColor },
    bottom: { style: BorderStyle.SINGLE, size: 2, color: primaryColor },
    left: { style: BorderStyle.SINGLE, size: 1, color: '1E4F57' },
    right: { style: BorderStyle.SINGLE, size: 1, color: '1E4F57' }
  };

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: { font: 'Calibri', size: 22, color: '1E293B' },
          paragraph: { spacing: { line: 276, before: 60, after: 60 } }
        }
      }
    },
    sections: [{
      properties: {
        page: {
          margin: { top: 1080, right: 1080, bottom: 1080, left: 1080 }
        }
      },
      headers: {
        default: new Header({
          children: [
            new Paragraph({
              alignment: AlignmentType.RIGHT,
              children: [
                new TextRun({ text: 'Packaging Development Tracker — Governance & Authority Guide', size: 18, color: '64748B', italics: true })
              ]
            })
          ]
        })
      },
      footers: {
        default: new Footer({
          children: [
            new Paragraph({
              alignment: AlignmentType.SPACE_BETWEEN,
              children: [
                new TextRun({ text: 'CONFIDENTIAL — FOR INTERNAL PACKAGING & OPERATIONS TEAMS ONLY', size: 16, color: '94A3B8' }),
                new TextRun({ text: 'Page ', size: 16, color: '94A3B8' }),
                new TextRun({ children: [PageNumber.CURRENT], size: 16, color: '94A3B8' }),
                new TextRun({ text: ' of ', size: 16, color: '94A3B8' }),
                new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 16, color: '94A3B8' })
              ]
            })
          ]
        })
      },
      children: [
        // Title block
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 100, after: 60 },
          children: [
            new TextRun({
              text: 'PACKAGING DEVELOPMENT TRACKER',
              size: 36,
              bold: true,
              color: primaryColor
            })
          ]
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 0, after: 200 },
          children: [
            new TextRun({
              text: 'OPERATIONAL GOVERNANCE, RACI AUTHORITY MATRIX & WORKFLOW MANUAL',
              size: 20,
              bold: true,
              color: '059669'
            })
          ]
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 0, after: 240 },
          children: [
            new TextRun({ text: 'Document Version: 2.0  ·  Scope: NPD & EPD Packaging  ·  Brief to Launch Pipeline', size: 18, color: '64748B' })
          ]
        }),

        // Divider
        new Paragraph({
          spacing: { before: 60, after: 180 },
          border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: primaryColor } },
          children: []
        }),

        // Section 1: Executive Overview
        new Paragraph({
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 200, after: 100 },
          children: [
            new TextRun({ text: '1. Executive Overview & Purpose', size: 28, bold: true, color: primaryColor })
          ]
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: 'The Packaging Development Tracker is an enterprise-grade stage-gate management system designed to govern the end-to-end commercial packaging rollout from initial marketing brief to final market launch. It standardizes technical specifications, eliminates inter-departmental communication bottlenecks, enforces quality sign-off gates, and tracks real-time milestone lead times across all physical packaging components.'
            })
          ]
        }),
        new Paragraph({
          children: [
            new TextRun({ bold: true, text: 'Core Business Objectives: ' }),
            new TextRun({ text: ' (1) Achieve 100% On-Time-In-Full (OTIF) launch delivery; (2) Lock dielines and specifications early to prevent artwork rework; (3) Eliminate regulatory text non-compliance; (4) Provide full auditability for every stage transition and technical specification modification.' })
          ]
        }),

        // Section 2: System Access Authority
        new Paragraph({
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 260, after: 100 },
          children: [
            new TextRun({ text: '2. System Access Authority (Application Roles & Permissions)', size: 28, bold: true, color: primaryColor })
          ]
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: 'The digital application enforces strict Role-Based Access Control (RBAC). User permissions are split into four tiers to protect project integrity while offering transparent visibility across functional stakeholders:'
            })
          ]
        }),

        // RBAC Table
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              tableHeader: true,
              children: [
                new TableCell({
                  width: { size: 36, type: WidthType.PERCENTAGE },
                  shading: { fill: primaryColor, type: ShadingType.CLEAR },
                  borders: headerCellBorder,
                  children: [new Paragraph({ children: [new TextRun({ text: 'System Action / Feature', bold: true, color: 'FFFFFF', size: 20 })] })]
                }),
                new TableCell({
                  width: { size: 16, type: WidthType.PERCENTAGE },
                  shading: { fill: primaryColor, type: ShadingType.CLEAR },
                  borders: headerCellBorder,
                  children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Viewer', bold: true, color: 'FFFFFF', size: 20 })] })]
                }),
                new TableCell({
                  width: { size: 16, type: WidthType.PERCENTAGE },
                  shading: { fill: primaryColor, type: ShadingType.CLEAR },
                  borders: headerCellBorder,
                  children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Editor', bold: true, color: 'FFFFFF', size: 20 })] })]
                }),
                new TableCell({
                  width: { size: 16, type: WidthType.PERCENTAGE },
                  shading: { fill: primaryColor, type: ShadingType.CLEAR },
                  borders: headerCellBorder,
                  children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Admin', bold: true, color: 'FFFFFF', size: 20 })] })]
                }),
                new TableCell({
                  width: { size: 16, type: WidthType.PERCENTAGE },
                  shading: { fill: primaryColor, type: ShadingType.CLEAR },
                  borders: headerCellBorder,
                  children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Super Admin', bold: true, color: 'FFFFFF', size: 20 })] })]
                })
              ]
            }),
            ...[
              ['View Analytics Dashboard, Tracker & Gantt', 'YES', 'YES', 'YES', 'YES'],
              ['Export Project Data to CSV Spreadsheet', 'YES', 'YES', 'YES', 'YES'],
              ['Search, Filter by Stage, Status & Lead Time', 'YES', 'YES', 'YES', 'YES'],
              ['Create New Project (+ New Project Modal)', 'NO', 'YES', 'YES', 'YES'],
              ['Advance Component / Project Stage', 'NO', 'YES', 'YES', 'YES'],
              ['Edit Technical Specs (Dieline, Dims, GSM, Finish)', 'NO', 'YES', 'YES', 'YES'],
              ['Edit Inline FG Code & Supplier Names', 'NO', 'YES', 'YES', 'YES'],
              ['Modify Project Details (SKU, Type, Category)', 'NO', 'YES', 'YES', 'YES'],
              ['Adjust Brief Date & Auto-Recalculate Milestones', 'NO', 'YES', 'YES', 'YES'],
              ['Mark Project as Launched (Commercial Live)', 'NO', 'YES', 'YES', 'YES'],
              ['Delete Inactive / Cancelled Projects', 'NO', 'YES', 'YES', 'YES'],
              ['Revoke / Rollback Stage (Gate Failure Action)', 'NO', 'NO', 'YES', 'YES'],
              ['Live Audit Activity Stream & Unread Badges', 'NO', 'NO', 'YES', 'YES']
            ].map((row, idx) => new TableRow({
              children: [
                new TableCell({
                  borders: cellBorder,
                  shading: { fill: idx % 2 === 0 ? 'FFFFFF' : lightBg, type: ShadingType.CLEAR },
                  children: [new Paragraph({ children: [new TextRun({ text: row[0], size: 19 })] })]
                }),
                ...row.slice(1).map(val => new TableCell({
                  borders: cellBorder,
                  shading: { fill: idx % 2 === 0 ? 'FFFFFF' : lightBg, type: ShadingType.CLEAR },
                  children: [new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [new TextRun({
                      text: val,
                      bold: true,
                      size: 19,
                      color: val === 'YES' ? '059669' : '94A3B8'
                    })]
                  })]
                }))
              ]
            }))
          ]
        }),

        new Paragraph({ spacing: { before: 100, after: 60 }, children: [] }),

        // Detailed role description
        new Paragraph({
          children: [
            new TextRun({ bold: true, text: '• Viewer Role (All General Users & Cross-Functional Observers): ' }),
            new TextRun({ text: 'Has real-time, transparent visibility into project schedules, upcoming milestones, and packaging specifications. Designed for sales, field marketing, finance, and plant operations.' })
          ]
        }),
        new Paragraph({
          children: [
            new TextRun({ bold: true, text: '• Editor Role (Packaging Engineers, Project Leads): ' }),
            new TextRun({ text: 'Has full day-to-day operational execution rights. Responsible for entering technical drawings, selecting resin/substrate grades, updating suppliers, logging completed stages, and advancing materials.' })
          ]
        }),
        new Paragraph({
          children: [
            new TextRun({ bold: true, text: '• Admin Role (Department Heads, Packaging Leadership): ' }),
            new TextRun({ text: 'Holds supervisory and governance authority. Contains all Editor capabilities plus the critical ' }),
            new TextRun({ bold: true, text: 'Stage Revocation Gate' }),
            new TextRun({ text: '. If a test fails or artwork is rejected by legal, only an Admin can push a project backward. Admins also review the real-time activity stream to audit who completed each milestone and when.' })
          ]
        }),

        // Section 3: RACI Matrix
        new Paragraph({
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 260, after: 100 },
          children: [
            new TextRun({ text: '3. Cross-Functional Authority & Governance (RACI Matrix)', size: 28, bold: true, color: primaryColor })
          ]
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: 'To ensure clear accountability across the 10-stage development pipeline, every activity is mapped to the standard RACI governance framework across 7 company functions:'
            })
          ]
        }),

        // RACI Definitions Legend
        new Paragraph({
          spacing: { before: 60, after: 120 },
          children: [
            new TextRun({ bold: true, text: 'A = Accountable: ', color: 'D97706' }),
            new TextRun({ text: 'The single decision-maker who approves the phase. Only ONE "A" per stage.\n' }),
            new TextRun({ bold: true, text: 'R = Responsible: ', color: '0284C7' }),
            new TextRun({ text: 'The "doers" who execute the deliverables and complete the physical work.\n' }),
            new TextRun({ bold: true, text: 'C = Consulted: ', color: '7C3AED' }),
            new TextRun({ text: 'Two-way communication; subject matter experts whose sign-off is mandatory.\n' }),
            new TextRun({ bold: true, text: 'I = Informed: ', color: '64748B' }),
            new TextRun({ text: 'One-way communication; stakeholders kept updated on dates and progress.' })
          ]
        }),

        // RACI Table
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              tableHeader: true,
              children: [
                new TableCell({
                  width: { size: 23, type: WidthType.PERCENTAGE },
                  shading: { fill: primaryColor, type: ShadingType.CLEAR },
                  borders: headerCellBorder,
                  children: [new Paragraph({ children: [new TextRun({ text: 'Stage / Gate', bold: true, color: 'FFFFFF', size: 19 })] })]
                }),
                ...FUNCTIONS.map(f => new TableCell({
                  width: { size: 11, type: WidthType.PERCENTAGE },
                  shading: { fill: primaryColor, type: ShadingType.CLEAR },
                  borders: headerCellBorder,
                  children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: f, bold: true, color: 'FFFFFF', size: 16 })] })]
                }))
              ]
            }),
            ...Object.keys(RACI_DATA).map((stage, sIdx) => new TableRow({
              children: [
                new TableCell({
                  borders: cellBorder,
                  shading: { fill: sIdx % 2 === 0 ? 'FFFFFF' : lightBg, type: ShadingType.CLEAR },
                  children: [new Paragraph({ children: [new TextRun({ text: `${sIdx + 1}. ${stage}`, bold: true, size: 18 })] })]
                }),
                ...RACI_DATA[stage].map(code => {
                  let codeColor = '64748B';
                  let isBold = false;
                  if (code === 'A') { codeColor = 'D97706'; isBold = true; }
                  else if (code === 'R') { codeColor = '0284C7'; isBold = true; }
                  else if (code === 'C') { codeColor = '7C3AED'; isBold = true; }

                  return new TableCell({
                    borders: cellBorder,
                    shading: { fill: code === 'A' ? 'FEF3C7' : (code === 'R' ? 'E0F2FE' : (sIdx % 2 === 0 ? 'FFFFFF' : lightBg)), type: ShadingType.CLEAR },
                    children: [new Paragraph({
                      alignment: AlignmentType.CENTER,
                      children: [new TextRun({ text: code, bold: isBold, color: codeColor, size: 19 })]
                    })]
                  });
                })
              ]
            }))
          ]
        }),

        new Paragraph({ spacing: { before: 140, after: 60 }, children: [] }),

        // Section 4: Stage SOPs and Quality Gates
        new Paragraph({
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 260, after: 100 },
          children: [
            new TextRun({ text: '4. Stage-by-Stage Quality Gates & Responsibilities', size: 28, bold: true, color: primaryColor })
          ]
        }),

        ...STAGE_DEFS.map((s, idx) => [
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 140, after: 60 },
            children: [
              new TextRun({ text: `Stage ${s.num}: ${s.full} (${s.id})`, size: 22, bold: true, color: '0284C7' }),
              new TextRun({ text: `  ·  Lead Time: ${s.lead}`, size: 18, italics: true, color: '64748B' })
            ]
          }),
          new Paragraph({
            children: [
              new TextRun({ bold: true, text: '• Stage Ownership: ' }),
              new TextRun({ text: s.owner }),
              new TextRun({ text: '  —  ' }),
              new TextRun({ text: s.desc })
            ]
          }),
          new Paragraph({
            children: [
              new TextRun({ bold: true, text: '• Mandatory Inputs: ' }),
              new TextRun({ text: s.inputs.join(', ') })
            ]
          }),
          new Paragraph({
            children: [
              new TextRun({ bold: true, text: '• Key Deliverables: ' }),
              new TextRun({ text: s.outputs.join(', ') })
            ]
          }),
          new Paragraph({
            spacing: { before: 40, after: 100 },
            children: [
              new TextRun({ bold: true, text: '• Quality Gate Checklist: ' }),
              new TextRun({ text: s.checks.map(c => `[ ✓ ] ${c}`).join('  |  '), color: '059669', bold: true })
            ]
          })
        ]).flat(),

        // Section 5: Automated Workflow Engine
        new Paragraph({
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 260, after: 100 },
          children: [
            new TextRun({ text: '5. Automated Tracking Engine & Operating Rules', size: 28, bold: true, color: primaryColor })
          ]
        }),
        new Paragraph({
          children: [
            new TextRun({ bold: true, text: '1. Multi-Material Component Tracking: ' }),
            new TextRun({ text: 'Packaging for a single product typically requires multiple materials (e.g. Primary printed film, mono carton box, corrugated shipper). Each material can be advanced independently to reflect physical supplier delivery realities.' })
          ]
        }),
        new Paragraph({
          children: [
            new TextRun({ bold: true, text: '2. Synchronized Project Gating (Slowest Component Rule): ' }),
            new TextRun({ text: 'The overall Project Stage is dynamically locked to the MINIMUM stage among all its active materials. A project cannot be launched until every packaging component has completed Stage 09 (Connectivity).' })
          ]
        }),
        new Paragraph({
          children: [
            new TextRun({ bold: true, text: '3. Dynamic Printing Lead Times: ' }),
            new TextRun({ text: 'Stage 07 (Printing) lead times are dynamically calculated based on the printing substrate technology chosen: Digital Print (10 calendar days), Flexo Print (20 calendar days), Gravure Print (35 calendar days).' })
          ]
        }),
        new Paragraph({
          children: [
            new TextRun({ bold: true, text: '4. Automated Variance & Risk Tracking: ' }),
            new TextRun({ text: 'The tracker continuously evaluates current date against original milestone dates. If actual completion exceeds planned lead time, the project automatically flags as "At Risk" or "Delayed", calculating the exact slip days.' })
          ]
        }),
        new Paragraph({
          children: [
            new TextRun({ bold: true, text: '5. Immutable Audit Trail: ' }),
            new TextRun({ text: 'Every stage advancement, stage revocation, FG code update, or specification change is recorded with the user\'s name, email, timestamp, and variance delta in the live audit log.' })
          ]
        }),

        // Sign-off section
        new Paragraph({
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 260, after: 100 },
          children: [
            new TextRun({ text: '6. Stakeholder Sign-Off & Approval Block', size: 28, bold: true, color: primaryColor })
          ]
        }),
        new Paragraph({
          children: [
            new TextRun({ text: 'By signing below, the functional department heads confirm adherence to the RACI authorities, quality gate checks, and stage-advance operating procedures detailed in this document.' })
          ]
        }),
        new Paragraph({ spacing: { before: 80, after: 80 }, children: [] }),

        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              children: [
                new TableCell({
                  width: { size: 50, type: WidthType.PERCENTAGE },
                  borders: cellBorder,
                  children: [
                    new Paragraph({ children: [new TextRun({ text: 'Head of Brand Management:', bold: true, size: 20 })] }),
                    new Paragraph({ spacing: { before: 180, after: 40 }, children: [new TextRun({ text: 'Signature: ___________________________', color: '64748B' })] }),
                    new Paragraph({ children: [new TextRun({ text: 'Date: _______________________________', color: '64748B' })] })
                  ]
                }),
                new TableCell({
                  width: { size: 50, type: WidthType.PERCENTAGE },
                  borders: cellBorder,
                  children: [
                    new Paragraph({ children: [new TextRun({ text: 'Head of Packaging Development:', bold: true, size: 20 })] }),
                    new Paragraph({ spacing: { before: 180, after: 40 }, children: [new TextRun({ text: 'Signature: ___________________________', color: '64748B' })] }),
                    new Paragraph({ children: [new TextRun({ text: 'Date: _______________________________', color: '64748B' })] })
                  ]
                })
              ]
            }),
            new TableRow({
              children: [
                new TableCell({
                  width: { size: 50, type: WidthType.PERCENTAGE },
                  borders: cellBorder,
                  children: [
                    new Paragraph({ children: [new TextRun({ text: 'Head of Supply Chain & Logistics:', bold: true, size: 20 })] }),
                    new Paragraph({ spacing: { before: 180, after: 40 }, children: [new TextRun({ text: 'Signature: ___________________________', color: '64748B' })] }),
                    new Paragraph({ children: [new TextRun({ text: 'Date: _______________________________', color: '64748B' })] })
                  ]
                }),
                new TableCell({
                  width: { size: 50, type: WidthType.PERCENTAGE },
                  borders: cellBorder,
                  children: [
                    new Paragraph({ children: [new TextRun({ text: 'Head of Quality & Regulatory:', bold: true, size: 20 })] }),
                    new Paragraph({ spacing: { before: 180, after: 40 }, children: [new TextRun({ text: 'Signature: ___________________________', color: '64748B' })] }),
                    new Paragraph({ children: [new TextRun({ text: 'Date: _______________________________', color: '64748B' })] })
                  ]
                })
              ]
            })
          ]
        })
      ]
    }]
  });

  const buffer = await Packer.toBuffer(doc);
  const outputPath = path.resolve(__dirname, '..', 'Packaging_Development_Tracker_Authority_Guide.docx');
  fs.writeFileSync(outputPath, buffer);
  console.log('✅ Word document generated successfully at:', outputPath);
  console.log('File size:', (buffer.length / 1024).toFixed(1), 'KB');
}

buildDoc().catch(err => {
  console.error('❌ Error building docx:', err);
  process.exit(1);
});
