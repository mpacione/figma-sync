"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildCodePatchesForChanges = buildCodePatchesForChanges;
function buildCodePatchesForChanges(codeModel, designSpec, changes) {
    const patches = [];
    for (const change of changes.changes) {
        switch (change.type) {
            case 'RenameComponent': {
                const { componentId, newName, id } = change;
                const codeComponentNames = Object.entries(designSpec.mapping.codeComponentToDesignId)
                    .filter(([, designId]) => designId === componentId)
                    .map(([codeName]) => codeName);
                if (codeComponentNames.length === 0) {
                    // No corresponding code component; nothing to patch.
                    continue;
                }
                const hunks = [];
                for (const codeName of codeComponentNames) {
                    const matchingComponents = codeModel.components.filter((component) => component.name === codeName);
                    for (const component of matchingComponents) {
                        hunks.push({
                            filePath: component.sourceFile,
                            description: `Rename component ${codeName} to ${newName}`,
                            before: codeName,
                            after: newName,
                        });
                    }
                }
                if (hunks.length === 0) {
                    continue;
                }
                patches.push({
                    id,
                    description: `Rename components to ${newName}`,
                    hunks,
                });
                break;
            }
            case 'RenameScreen': {
                // Screen name changes currently do not affect code directly in this model,
                // so we do not emit patches yet. This branch exists for future extension.
                break;
            }
            case 'UpdateVariable': {
                const { id, variableId, variableName, newValue } = change;
                const tokenNames = Object.entries(designSpec.mapping.codeTokenToVariableId)
                    .filter(([, mappedId]) => mappedId === variableId)
                    .map(([tokenName]) => tokenName);
                if (tokenNames.length === 0) {
                    // No corresponding code token; nothing to patch.
                    break;
                }
                const hunks = [];
                for (const tokenName of tokenNames) {
                    const colorToken = codeModel.tokens.colors.find((t) => t.name === tokenName);
                    if (colorToken && typeof newValue === 'string') {
                        const before = colorToken.value.hex;
                        const after = newValue;
                        const loc = colorToken.locations[0];
                        if (loc) {
                            const beforeDeclaration = `${tokenName}: ${before};`;
                            const afterDeclaration = `${tokenName}: ${after};`;
                            hunks.push({
                                filePath: loc.filePath,
                                description: `Update color token ${tokenName} from ${before} to ${after}`,
                                before,
                                after,
                                tokenName,
                                tokenKind: 'color',
                                beforeDeclaration,
                                afterDeclaration,
                            });
                        }
                        continue;
                    }
                    const radiusToken = codeModel.tokens.radii.find((t) => t.name === tokenName);
                    if (radiusToken && typeof newValue === 'number') {
                        const before = String(radiusToken.value);
                        const after = String(newValue);
                        const loc = radiusToken.locations[0];
                        if (loc) {
                            const unit = radiusToken.unit ?? 'px';
                            const beforeDeclaration = `${tokenName}: ${before}${unit};`;
                            const afterDeclaration = `${tokenName}: ${after}${unit};`;
                            hunks.push({
                                filePath: loc.filePath,
                                description: `Update radius token ${tokenName} from ${before} to ${after}`,
                                before,
                                after,
                                tokenName,
                                tokenKind: 'radius',
                                beforeDeclaration,
                                afterDeclaration,
                            });
                        }
                        continue;
                    }
                    const spacingToken = codeModel.tokens.spacing.find((t) => t.name === tokenName);
                    if (spacingToken && typeof newValue === 'number') {
                        const before = String(spacingToken.value);
                        const after = String(newValue);
                        const loc = spacingToken.locations[0];
                        if (loc) {
                            const unit = spacingToken.unit ?? 'px';
                            const beforeDeclaration = `${tokenName}: ${before}${unit};`;
                            const afterDeclaration = `${tokenName}: ${after}${unit};`;
                            hunks.push({
                                filePath: loc.filePath,
                                description: `Update spacing token ${tokenName} from ${before} to ${after}`,
                                before,
                                after,
                                tokenName,
                                tokenKind: 'spacing',
                                beforeDeclaration,
                                afterDeclaration,
                            });
                        }
                        continue;
                    }
                    const typographyToken = codeModel.tokens.typography.find((t) => t.name === tokenName);
                    if (typographyToken && typeof newValue === 'number') {
                        const before = String(typographyToken.fontSize);
                        const after = String(newValue);
                        const loc = typographyToken.locations[0];
                        if (loc) {
                            const beforeDeclaration = `${tokenName}: ${before};`;
                            const afterDeclaration = `${tokenName}: ${after};`;
                            hunks.push({
                                filePath: loc.filePath,
                                description: `Update typography token ${tokenName} from ${before} to ${after}`,
                                before,
                                after,
                                tokenName,
                                tokenKind: 'typography',
                                beforeDeclaration,
                                afterDeclaration,
                            });
                        }
                        continue;
                    }
                }
                if (hunks.length > 0) {
                    patches.push({
                        id,
                        description: `Update design token variable ${variableName}`,
                        hunks,
                    });
                }
                break;
            }
            default: {
                // Exhaustiveness guard for future change types.
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                const _exhaustive = change;
                break;
            }
        }
    }
    return { version: '1.0', patches };
}
