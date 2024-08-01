const { JSDOM } = require('jsdom');

const processNode = (node, marks = []) => {
  if (node.nodeType === 3) {
    // Text node
    return {
      type: 'text',
      text: node.textContent,
      marks: [...marks],
    };
  }

  if (node.nodeName === 'BR') {
    return {
      type: 'hardBreak',
    };
  }

  let textNode = {
    type: 'text',
    text: node.textContent,
    marks: [...marks],
  };

  switch (node.nodeName) {
    case 'CODE':
      textNode.marks.push({ type: 'code' });
      break;
    case 'STRONG':
    case 'B':
      textNode.marks.push({ type: 'strong' });
      break;
    case 'DEL':
      textNode.marks.push({ type: 'strike' });
      break;
    case 'EM':
    case 'I':
      textNode.marks.push({ type: 'em' });
      break;
    case 'U':
      textNode.marks.push({ type: 'underline' });
      break;
    case 'A':
      textNode.marks.push({
        type: 'link',
        attrs: {
          href: node.getAttribute('href'),
          title: node.textContent,
        },
      });
      break;
  }

  if (node.childNodes.length > 0) {
    return Array.from(node.childNodes)
      .map((childNode) => processNode(childNode, textNode.marks))
      .flat();
  }

  return textNode;
};

const handleList = (node, listType) => {
  const items = Array.from(node.children).map((li) => {
    const liContent = Array.from(li.childNodes)
      .map((childNode) => {
        if (childNode.nodeName === 'UL' || childNode.nodeName === 'OL') {
          return handleList(
            childNode,
            childNode.nodeName === 'UL' ? 'bulletList' : 'orderedList'
          );
        }
        return processNode(childNode, []);
      })
      .flat()
      .filter(Boolean);

    return {
      type: 'listItem',
      content: [
        {
          type: 'paragraph',
          content: liContent.filter(
            (item) => item.type !== 'bulletList' && item.type !== 'orderedList'
          ),
        },
        ...liContent.filter(
          (item) => item.type === 'bulletList' || item.type === 'orderedList'
        ),
      ],
    };
  });

  return {
    type: listType,
    content: items,
  };
};

const convertToADF = (htmlString) => {
  const dom = new JSDOM(htmlString);
  const document = dom.window.document;
  const adf = {
    version: 1,
    type: 'doc',
    content: [],
  };

  document.body.childNodes.forEach((node) => {
    const textNodes = Array.from(node.childNodes)
      .map((childNode) => processNode(childNode, []))
      .flat()
      .filter(Boolean);

    switch (node.nodeName) {
      case 'P':
        adf.content.push({
          type: 'paragraph',
          content: textNodes,
        });
        break;
      case 'H1':
      case 'H2':
      case 'H3':
      case 'H4':
      case 'H5':
      case 'H6':
        const level = parseInt(node.nodeName.substring(1));
        adf.content.push({
          type: 'heading',
          attrs: {
            level: level,
          },
          content: textNodes,
        });
        break;
      case 'UL':
        adf.content.push(handleList(node, 'bulletList'));
        break;
      case 'OL':
        adf.content.push(handleList(node, 'orderedList'));
        break;
      case 'BLOCKQUOTE':
        adf.content.push({
          type: 'blockquote',
          content: [
            {
              type: 'paragraph',
              content: textNodes,
            },
          ],
        });
        break;
      default:
        if (textNodes.length > 0) {
          adf.content.push({
            type: 'paragraph',
            content: textNodes,
          });
        }
    }
  });

  return adf;
};

module.exports = convertToADF;


// module.exports = convertToADF;

