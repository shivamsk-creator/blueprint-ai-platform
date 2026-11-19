import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { Document, HeadingLevel, Packer, Paragraph, TextRun } from "docx";
import yaml from "yaml";
import {
  generateOpenApiSpec,
  generateSqlMigrationDraft,
  type ApiEndpoint,
  type Artifact,
  type ArtifactRevision,
  type DbEntity,
  type DbRelationship,
  type ExportFormat,
  type Project,
  type Requirement,
  type TraceabilityMatrixReport,
} from "@blueprint/domain";

export interface ExportRenderInput {
  project: Project;
  format: ExportFormat;
  artifacts: Array<{ artifact: Artifact; revision: ArtifactRevision }>;
  requirements: Requirement[];
  dbEntities: DbEntity[];
  dbRelationships: DbRelationship[];
  apiEndpoints: ApiEndpoint[];
  traceability?: TraceabilityMatrixReport;
}

export interface RenderedExport {
  bytes: Uint8Array;
  mimeType: string;
  fileName: string;
}

function buildMarkdownDocument(input: ExportRenderInput): string {
  const lines: string[] = [
    `# ${input.project.name} — Blueprint Specification Bundle`,
    "",
    `- **Project Slug**: \`${input.project.slug}\``,
    `- **Status**: ${input.project.status}`,
    `- **Generated At**: ${new Date().toISOString()}`,
    `- **Included Revisions**: ${input.artifacts.map((a) => `${a.artifact.artifactType.toUpperCase()} v${a.revision.versionNo} (${a.revision.status})`).join(", ") || "All current"}`,
    "",
    "## Executive Brief",
    input.project.description || "_No brief provided._",
    "",
  ];

  for (const item of input.artifacts) {
    lines.push(`---`, "", `# ${item.artifact.title} (v${item.revision.versionNo} — ${item.revision.status})`, "");
    if (item.revision.content.summary) {
      lines.push(`> ${item.revision.content.summary}`, "");
    }
    for (const sec of item.revision.content.sections) {
      lines.push(`## ${sec.heading}`, "", sec.bodyMarkdown, "");
    }
  }

  if (input.requirements.length > 0) {
    lines.push("---", "", "# Canonical Requirements Repository", "");
    lines.push("| Key | Type | Priority | Status | Title |");
    lines.push("| --- | --- | --- | --- | --- |");
    for (const req of input.requirements) {
      lines.push(`| ${req.requirementKey} | ${req.requirementType} | ${req.priority} | ${req.status} | ${req.title} |`);
    }
    lines.push("");
  }

  if (input.traceability) {
    lines.push(
      "---",
      "",
      `# Traceability Coverage Summary (${input.traceability.overallCoveragePct}%)`,
      "",
      `- Total Requirements: ${input.traceability.totalRequirements}`,
      `- Confirmed Requirements: ${input.traceability.confirmedRequirements}`,
      `- Linked to Features: ${input.traceability.requirementsWithFeatures}`,
      `- Linked to Tasks: ${input.traceability.requirementsWithTasks}`,
      `- Linked to QA Tests: ${input.traceability.requirementsWithTests}`,
      ""
    );
  }

  return lines.join("\n");
}

function sanitizePdfText(text: string): string {
  // Standard PDF WinAnsi encoding safety
  return text.replace(/[^\x20-\x7E\n]/g, " ");
}

function wrapText(text: string, maxChars: number): string[] {
  const out: string[] = [];
  for (const rawLine of text.split("\n")) {
    if (rawLine.length <= maxChars) {
      out.push(rawLine);
      continue;
    }
    const words = rawLine.split(/\s+/);
    let current = "";
    for (const word of words) {
      if ((current + " " + word).trim().length > maxChars) {
        if (current) out.push(current);
        current = word;
      } else {
        current = (current + " " + word).trim();
      }
    }
    if (current) out.push(current);
  }
  return out;
}

async function renderPdf(input: ExportRenderInput): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  let page = pdfDoc.addPage([612, 792]);
  let y = 740;
  const left = 48;

  const ensureSpace = (needed: number): void => {
    if (y - needed < 56) {
      page = pdfDoc.addPage([612, 792]);
      y = 740;
    }
  };

  const drawHeading = (text: string, size: number): void => {
    ensureSpace(size + 14);
    page.drawText(sanitizePdfText(text), {
      x: left,
      y,
      size,
      font: fontBold,
      color: rgb(0.06, 0.09, 0.16),
    });
    y -= size + 10;
  };

  const drawBody = (text: string, size = 10): void => {
    const lines = wrapText(sanitizePdfText(text), 84);
    for (const line of lines) {
      ensureSpace(size + 6);
      page.drawText(line, {
        x: left,
        y,
        size,
        font: fontRegular,
        color: rgb(0.2, 0.25, 0.33),
      });
      y -= size + 5;
    }
    y -= 6;
  };

  drawHeading(`Blueprint AI — ${input.project.name}`, 18);
  drawBody(
    `Slug: ${input.project.slug} | Status: ${input.project.status} | Generated: ${new Date().toISOString()}`,
    9
  );
  drawBody(input.project.description || "No project description provided.");

  for (const item of input.artifacts) {
    drawHeading(`${item.artifact.title} (v${item.revision.versionNo} - ${item.revision.status})`, 14);
    for (const sec of item.revision.content.sections) {
      drawHeading(sec.heading, 11);
      drawBody(sec.bodyMarkdown);
    }
  }

  if (input.requirements.length > 0) {
    drawHeading("Canonical Requirements", 14);
    for (const req of input.requirements) {
      drawBody(`${req.requirementKey} [${req.priority}/${req.status}] ${req.title}: ${req.description}`);
    }
  }

  return pdfDoc.save();
}

async function renderDocx(input: ExportRenderInput): Promise<Uint8Array> {
  const children: Paragraph[] = [
    new Paragraph({
      text: `${input.project.name} — Blueprint Specification`,
      heading: HeadingLevel.TITLE,
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: `Project: ${input.project.slug} | Status: ${input.project.status} | Generated: ${new Date().toISOString()}`,
          italics: true,
        }),
      ],
    }),
    new Paragraph({ text: input.project.description || "" }),
  ];

  for (const item of input.artifacts) {
    children.push(
      new Paragraph({
        text: `${item.artifact.title} (v${item.revision.versionNo} — ${item.revision.status})`,
        heading: HeadingLevel.HEADING_1,
      })
    );
    for (const sec of item.revision.content.sections) {
      children.push(new Paragraph({ text: sec.heading, heading: HeadingLevel.HEADING_2 }));
      for (const line of sec.bodyMarkdown.split("\n")) {
        children.push(new Paragraph({ text: line }));
      }
    }
  }

  if (input.requirements.length > 0) {
    children.push(new Paragraph({ text: "Requirements Repository", heading: HeadingLevel.HEADING_1 }));
    for (const req of input.requirements) {
      children.push(
        new Paragraph({
          text: `${req.requirementKey} [${req.priority} / ${req.status}] — ${req.title}: ${req.description}`,
        })
      );
    }
  }

  const doc = new Document({ sections: [{ children }] });
  const buf = await Packer.toBuffer(doc);
  return new Uint8Array(buf);
}

export async function renderBlueprintExport(input: ExportRenderInput): Promise<RenderedExport> {
  const encoder = new TextEncoder();
  switch (input.format) {
    case "pdf": {
      const bytes = await renderPdf(input);
      return {
        bytes,
        mimeType: "application/pdf",
        fileName: `${input.project.slug}-blueprint.pdf`,
      };
    }
    case "docx": {
      const bytes = await renderDocx(input);
      return {
        bytes,
        mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        fileName: `${input.project.slug}-blueprint.docx`,
      };
    }
    case "markdown": {
      const md = buildMarkdownDocument(input);
      return {
        bytes: encoder.encode(md),
        mimeType: "text/markdown; charset=utf-8",
        fileName: `${input.project.slug}-blueprint.md`,
      };
    }
    case "json": {
      const payload = {
        schemaVersion: "1.0",
        generatedAt: new Date().toISOString(),
        project: input.project,
        artifacts: input.artifacts.map((a) => ({
          artifactId: a.artifact.id,
          artifactType: a.artifact.artifactType,
          title: a.artifact.title,
          revisionId: a.revision.id,
          versionNo: a.revision.versionNo,
          status: a.revision.status,
          content: a.revision.content,
        })),
        requirements: input.requirements,
        traceability: input.traceability ?? null,
      };
      return {
        bytes: encoder.encode(JSON.stringify(payload, null, 2)),
        mimeType: "application/json; charset=utf-8",
        fileName: `${input.project.slug}-blueprint.json`,
      };
    }
    case "sql": {
      const sql = generateSqlMigrationDraft(input.dbEntities, input.dbRelationships);
      return {
        bytes: encoder.encode(sql),
        mimeType: "application/sql; charset=utf-8",
        fileName: `${input.project.slug}-migration-draft.sql`,
      };
    }
    case "openapi": {
      const { spec } = generateOpenApiSpec(input.project, input.apiEndpoints);
      const yml = yaml.stringify(spec);
      return {
        bytes: encoder.encode(yml),
        mimeType: "application/yaml; charset=utf-8",
        fileName: `${input.project.slug}-openapi.yaml`,
      };
    }
  }
}
