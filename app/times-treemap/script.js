module.exports = require('../index.js')('times-treemap');

if (typeof document !== 'undefined') {
  require('./style.scss');
  const data = require('./data/budget.json');
  const d3 = Object.assign(
    {},
    require('d3-selection'),
    require('d3-jetpack'),
    require('d3-hierarchy'),
    require('d3-scale'),
    require('d3-format')
  );

  Polymer({
    is: 'times-treemap',

    properties: {},

    // Use for one-time set-up before property values are set
    created: function() {
      this._dataset = data;
    },

    draw: function(node) {
      const elementWidth = node.parentElement.clientWidth;

      // set config object
      const config = { width: elementWidth, height: 450 };

      const timesColors = [
        '#254251',
        '#E0AB26',
        '#F37F2F',
        '#3292A6',
        '#6c3c5e',
      ];
      const color = d3.scaleOrdinal(timesColors);
      const format = d3.format(',d');

      // The config object passed by draw() gives us a width and height
      const margin = { top: 20, left: 20, right: 90, bottom: 0 };
      if (config.width < 400) {
        margin.right = -10;
        margin.bottom = 110;
      }

      const width = config.width - margin.left - margin.right;
      const height = config.height - margin.top - margin.bottom;

      const svgElement = this.$$('svg');

      // Clean up before drawing
      d3.select(svgElement).html('');

      const svg = d3
        .select(svgElement)
        .at({ width: config.width, height: config.height })
        .style('overflow', 'visible');

      const treemap = d3
        .treemap()
        .tile(d3.treemapResquarify)
        .size([width, height])
        .round(true)
        .paddingOuter(2)
        .paddingInner(1);

      const root = d3
        .hierarchy(this._dataset)
        .eachBefore(
          d =>
            (d.data.id = (d.parent ? d.parent.data.id + '.' : '') + d.data.name)
        )
        .sum(d => d.dr)
        .sort((a, b) => b.height - a.height || b.value - a.value);

      treemap(root);

      // One cell per player
      const container = svg
        .append('g')
        .attr('class', 'container')
        .attr('transform', d => {
          if (config.width < 400) {
            return 'translate(0,' + 50 + ')';
          }
          return;
        });

      const cell = container
        .selectAll('g')
        .data(root.leaves())
        .enter()
        .append('g')
        .translate(d => [d.x0, d.y0]);

      cell
        .append('rect')
        .at({
          id: d => d.data.id,
          class: d => {
            if (d.x1 - d.x0 > 120 && d.y1 - d.y0 > 40) {
              return 'wide';
            }
            if (d.x1 - d.x0 < 50) {
              return ' narrow';
            }
            return;
          },
          width: d => d.x1 - d.x0,
          height: d => d.y1 - d.y0,
          fill: d => color(d.parent.data.id),
        })
        .on('mouseover', function(d) {
          const _this = this;
          d3
            .selectAll('rect')
            .transition()
            .duration(200)
            .style('opacity', function() {
              return this === _this ? 1.0 : 0.6;
            });
        })
        .on('mouseout', () =>
          d3.selectAll('rect').transition().duration(500).style('opacity', 1)
        );

      cell
        .append('text')
        .attr('clip-path', d => 'url(#clip-' + d.data.id + ')')
        .append('tspan')
        .at({ x: 8, y: 24, dy: '.8em', class: 'playerNames' })
        .text(function(d) {
          const parentRect = this.parentNode.previousElementSibling;
          if (d3.select(parentRect).classed('wide')) {
            return d.data.name;
          }
          return;
        });

      cell
        .append('text')
        .attr('clip-path', d => 'url(#clip-' + d.data.id + ')')
        .append('tspan')
        .at({ x: 8, y: 8, dy: '.8em', class: 'playerNames' })
        .text(function(d) {
          const parentRect = this.parentNode.previousElementSibling
            .previousElementSibling;
          if (!d3.select(parentRect).classed('narrow')) {
            return '£' + d.data.dr + 'm';
          }
          return;
        });

      // contains the key and the info box on desktop only
      const legendContainer = container
        .append('g')
        .at({ class: 'legend' })
        .translate(() => (config.width < 400 ? [5, 320] : [width + 10, 0]));

      // different g element to be used for mobile, way above the treemap
      const mobileLegend = container
        .append('g')
        .at({ class: 'legend' })
        .translate([0, -180]);

      const key = [
        { name: 'Money in', color: '#254251' },
        { name: 'Money out', color: '#E0AB26' },
      ];

      this.makeLegend(key, config.width, width, legendContainer);
      cell.on('click', d => {
        // we pass different elements on desktop and mobile, because designs
        const legendTarget =
          config.width < 400 ? mobileLegend : legendContainer;
        this.appendOnClick(d, config.width, width, legendTarget);
      });
    },

    makeLegend: function(legendArray, width, position, legendContainer) {
      const legendWidth = width < 400 ? width : 100;
      const legendHeight = 70;

      console.log(legendArray);
      // Legend title includes a title and the lines under and above
      const legendTitle = legendContainer.append('g').at({
        class: 'legendTitle',
      });
      legendTitle
        .append('text')
        .at({
          x: 0,
          y: 25,
        })
        .text('Key');

      // Two lines
      legendTitle.append('line').at({
        x1: 0,
        x2: legendWidth,
        y1: 5,
        y2: 5,
        strokeWidth: 2,
        stroke: '#ddd',
      });
      legendTitle.append('line').at({
        x1: 0,
        x2: legendWidth,
        y1: legendHeight + 5,
        y2: legendHeight + 5,
        strokeWidth: 2,
        stroke: '#ddd',
      });

      // Coloured rectangles and labels
      const legendContent = legendContainer
        .append('g')
        .at({ class: 'legendContent' })
        .translate([0, 35]);

      legendContent
        .selectAll('rect')
        .data(legendArray)
        .enter()
        .append('rect')
        .at({ width: 10, height: 10 })
        .translate((d, i) => [0, i * 20])
        .style('fill', d => d.color)
        .style('stroke', d => d.color);
      legendContent
        .selectAll('text')
        .data(legendArray)
        .enter()
        .append('text')
        .at({
          x: 20,
          y: (d, i) => 10 + i * 20,
        })
        .style('color', '#666666')
        .style('fill', '#666666')
        .text(d => d.name);
    },

    appendOnClick: function(data, width, position, legendContainer) {
      d3.select('.info').remove();
      const classes = width < 400 ? 'bold mobile' : 'bold';
      const wrapBoldText = width < 400 ? 25 : 10;
      const wrapText = width < 400 ? 20 : 10;
      const elementTranslation = width < 400 ? 30 : 30;

      const info = legendContainer
        .append('g')
        .at({
          class: 'info',
        })
        .translate([0, 100]);

      info
        .append('text')
        .at({ class: classes })
        .tspans(() => d3.wordwrap(data.data.name, wrapBoldText))
        .at({ dy: (d, i) => i + 1 * 26 });

      info
        .append('text')
        .translate([0, elementTranslation])
        .text(d => '£' + data.data.dr + 'm')
        //.tspans(() => d3.wordwrap('£' + data.data.dr + 'm', wrapText * 2))
        .at({ dy: (d, i) => i + 1 * 16 });
    },

    // Use for one-time configuration after local DOM is initialized
    ready: function() {
      this.scopeSubtree(this.$['container'], true);

      setTimeout(() => {
        this.draw(this.$['times-treemap']);
      }, 500);
    },

    _resizeListener: function() {
      if (!this.ticking) {
        window.requestAnimationFrame(
          function() {
            this.draw();
            this.ticking = false;
          }.bind(this)
        );
      }
      this.ticking = true;
    },

    attached: function() {
      // event listener to re-draw on resize
      window.addEventListener(
        'resize',
        function() {
          this._resizeListener();
        }.bind(this)
      );
    },

    // Called after the element is detached from the document
    detached: function() {},

    // Use to handle attribute changes that don't correspond to declared properties
    attributeChanged: function(name, type) {},
  });
}
