export function shouldShowInlineImageUpload(imageCount) {
    return Number.isFinite(imageCount) && imageCount > 0;
}
