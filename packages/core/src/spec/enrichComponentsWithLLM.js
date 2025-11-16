"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.enrichDesignComponentsWithLLM = enrichDesignComponentsWithLLM;
const zod_1 = require("zod");
const DesignSpec_1 = require("../models/DesignSpec");
const zLlmExampleVariant = zod_1.z.object({
    name: zod_1.z.string(),
    props: zod_1.z.record(zod_1.z.union([zod_1.z.string(), zod_1.z.boolean()])),
});
const zLlmComponentEnrichment = zod_1.z.object({
    name: zod_1.z.string(),
    propsModel: DesignSpec_1.zDesignComponentPropsModel,
    exampleVariants: zod_1.z.array(zLlmExampleVariant),
});
const zLlmComponentsEnrichmentResponse = zod_1.z.object({
    components: zod_1.z.array(zLlmComponentEnrichment),
});
function buildComponentEnrichmentPrompt(codeModel) {
    const summary = {
        project: codeModel.projectMeta,
        components: codeModel.components.map((c) => ({
            name: c.name,
            kind: c.kind,
            tailwindClasses: c.tailwindClasses,
        })),
    };
    return [
        'You are helping map React UI components to Figma components.',
        'For each component, infer useful design-level variant props, slot props,',
        'and a small set of example variants for documentation.',
        '',
        'Respond ONLY with JSON matching this TypeScript type:',
        '  {',
        '    "components": [',
        '      {',
        '        "name": string,',
        '        "propsModel": {',
        '          "variantProps": { name: string; type: "boolean" | "enum"; values?: string[] }[],',
        '          "slotProps": { name: string; description?: string }[]',
        '        },',
        '        "exampleVariants": { name: string; props: Record<string, string | boolean> }[]',
        '      }',
        '    ]',
        '  }',
        '',
        'Components to analyse:',
        JSON.stringify(summary, null, 2),
    ].join('\n');
}
async function enrichDesignComponentsWithLLM(codeModel, baseComponents, llm) {
    if (baseComponents.length === 0)
        return baseComponents;
    const prompt = buildComponentEnrichmentPrompt(codeModel);
    const response = await llm.generateJSON(prompt, zLlmComponentsEnrichmentResponse);
    const byName = new Map();
    for (const entry of response.components) {
        byName.set(entry.name, entry);
    }
    return baseComponents.map((component) => {
        const enrichment = byName.get(component.name);
        if (!enrichment)
            return component;
        return {
            ...component,
            propsModel: enrichment.propsModel,
            exampleVariants: enrichment.exampleVariants.map((ex, index) => ({
                id: `${component.id}-ex-${index}`,
                name: ex.name,
                props: ex.props,
            })),
        };
    });
}
