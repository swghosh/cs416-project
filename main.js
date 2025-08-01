// State Parameters
let spiData, worldData;
let currentView = 'intro';
let currentCountry = null;
let currentComponent = null;
let currentContinent = 'all';

// D3 Selections
const container = d3.select('#narrative-container');
const narrativeText = d3.select('#narrative-text');
const tooltip = d3.select('#tooltip');
const backButton = d3.select('#back');

// Data Loading
Promise.all([
    d3.csv('spi.csv'),
    d3.json('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json')
]).then(([spi, world]) => {
    spiData = spi;
    worldData = world;
    update();
});

// Back Button Logic
backButton.on('click', () => {
    if (currentView === 'subComponent') {
        currentView = 'component';
    } else if (currentView === 'component') {
        currentView = 'country';
    } else if (currentView === 'country') {
        currentView = 'world';
        currentCountry = null;
    }
    update();
});

function createFilterButtons() {
    const continents = ['all', 'Asia', 'Europe', 'Africa', 'North America', 'South America', 'Oceania'];
    const filterContainer = d3.select('#filter-container');
    filterContainer.html('');

    continents.forEach(continent => {
        filterContainer.append('button')
            .attr('class', `filter-button ${currentContinent === continent ? 'active' : ''}`)
            .text(continent.charAt(0).toUpperCase() + continent.slice(1))
            .on('click', () => {
                currentContinent = continent;
                currentView = 'world';
                update();
            });
    });
}

// Main Update Function
function update() {
    createFilterButtons();
    container.html('');
    backButton.style('display', currentView !== 'intro' && currentView !== 'world' ? 'block' : 'none');

    switch (currentView) {
        case 'intro':
            createIntroScene();
            break;
        case 'world':
            createWorldMap();
            break;
        case 'country':
            createCountryDashboard(currentCountry);
            break;
        case 'component':
            createComponentDetail(currentCountry, currentComponent);
            break;
        case 'subComponent':
            // This view will be handled by the component detail click
            break;
    }
}

// Scene: Introduction
function createIntroScene() {
    container.append('div')
        .style('padding', '50px')
        .html(`
            <h2 style="font-family: 'Merriweather', serif;">What is Social Progress?</h2>
            <p style="font-family: 'Lato', sans-serif; font-size: 1.2em; line-height: 1.6;">
                The Social Progress Index (SPI) offers a comprehensive framework for measuring a country's social performance, independent of economic indicators. It assesses how well a society provides for the needs of its citizens, creates foundations for wellbeing, and expands opportunity. This interactive story allows you to explore the 2023 SPI data, from a global overview down to the specific factors that shape the lives of people around the world.
            </p>
            <button class="intro-button">Begin the Journey</button>
        `)
        .select('.intro-button')
        .on('click', () => {
            currentView = 'world';
            update();
        });
    narrativeText.html('Welcome! Click the button above to start exploring the Social Progress Index.');
}

// Scene: World Map
function createWorldMap() {
    const svg = container.append('svg').attr('width', '100%').attr('height', '100%');
    const projection = d3.geoMercator().scale(130).translate([480, 350]);
    const path = d3.geoPath().projection(projection);
    const spiDataByCountry = new Map(spiData.map(d => [d.country, d]));
    const colorScale = d3.scaleSequential(d3.interpolatePlasma).domain([40, 100]);

    let countries = topojson.feature(worldData, worldData.objects.countries).features;

    if (currentContinent !== 'all') {
        countries = countries.filter(d => countryToContinent[d.properties.name] === currentContinent);
    }

    const top5Countries = spiData
        .filter(d => currentContinent === 'all' || countryToContinent[d.country] === currentContinent)
        .sort((a, b) => b.spi_score - a.spi_score)
        .slice(0, 5);

    const barChartContainer = container.append('div')
        .style('position', 'absolute')
        .style('bottom', '20px')
        .style('left', '20px')
        .style('width', '250px')
        .style('background-color', 'rgba(255, 255, 255, 0.9)')
        .style('padding', '10px')
        .style('border-radius', '5px');

    barChartContainer.append('h4').text(`Top 5 in ${currentContinent === 'all' ? 'the World' : currentContinent}`);

    const barSvg = barChartContainer.append('svg').attr('width', '100%').attr('height', 200);

    const yScale = d3.scaleBand()
        .domain(top5Countries.map(d => d.country))
        .range([0, 200])
        .padding(0.1);

    const xScale = d3.scaleLinear()
        .domain([0, 100])
        .range([0, 230]);

    barSvg.selectAll('.bar')
        .data(top5Countries)
        .enter()
        .append('rect')
        .attr('class', 'bar')
        .attr('y', d => yScale(d.country))
        .attr('height', yScale.bandwidth())
        .attr('width', d => xScale(d.spi_score))
        .style('fill', d => colorScale(d.spi_score));

    barSvg.selectAll('.bar-label')
        .data(top5Countries)
        .enter()
        .append('text')
        .attr('class', 'bar-label')
        .attr('x', 5)
        .attr('y', d => yScale(d.country) + yScale.bandwidth() / 2)
        .attr('dy', '0.35em')
        .style('fill', '#fff')
        .text(d => `${d.country} (${(+d.spi_score).toFixed(2)})`);

    svg.selectAll('.country')
        .data(countries)
        .enter().append('path')
        .attr('class', 'country')
        .attr('d', path)
        .style('fill', d => {
            const countryData = spiDataByCountry.get(d.properties.name);
            return countryData ? colorScale(+countryData.spi_score) : '#ccc';
        })
        .on('mouseover', (event, d) => {
            const countryData = spiDataByCountry.get(d.properties.name);
            tooltip.style('opacity', 1)
                .html(`${d.properties.name}<br>SPI: ${countryData ? (+countryData.spi_score).toFixed(2) : 'N/A'}`)
                .style('left', (event.pageX + 10) + 'px')
                .style('top', (event.pageY - 28) + 'px');
        })
        .on('mouseout', () => tooltip.style('opacity', 0))
        .on('click', (event, d) => {
            const countryData = spiDataByCountry.get(d.properties.name);
            if (countryData) {
                currentCountry = countryData;
                currentView = 'country';
                update();
            }
        });

    narrativeText.html('This world map shows the overall Social Progress Index score for each country. Darker shades indicate higher social progress. Click on a country to drill down and explore its detailed performance.');
}

// Scene: Country Dashboard
function createCountryDashboard(countryData) {
    const svg = container.append('svg').attr('width', '100%').attr('height', '100%');
    svg.append('text').attr('x', '50%').attr('y', 40).attr('text-anchor', 'middle').style('font-size', '28px').style('font-weight', 'bold').text(countryData.country);

    const categories = [
        { name: 'Basic Human Needs', key: 'basic_human_needs', color: '#e74c3c' },
        { name: 'Foundations of Wellbeing', key: 'wellbeing', color: '#27ae60' },
        { name: 'Opportunity', key: 'opportunity', color: '#8e44ad' }
    ];
    const categoryData = categories.map(c => ({ category: c.name, value: +countryData[c.key], color: c.color, key: c.key }));

    const innerRadius = 80, outerRadius = 180;
    const xScale = d3.scaleBand().domain(categoryData.map(d => d.category)).range([0, 2 * Math.PI]).align(0);
    const yScale = d3.scaleRadial().domain([0, 100]).range([innerRadius, outerRadius]);

    const arc = d3.arc()
        .innerRadius(innerRadius)
        .outerRadius(d => yScale(d.value))
        .startAngle(d => xScale(d.category))
        .endAngle(d => xScale(d.category) + xScale.bandwidth())
        .padAngle(0.01).padRadius(innerRadius);

    const g = svg.append('g').attr('transform', 'translate(480, 300)');

    g.selectAll('path')
        .data(categoryData)
        .enter()
        .append('path')
        .attr('d', arc)
        .style('fill', d => d.color)
        .style('cursor', 'pointer')
        .on('click', (event, d) => {
            currentComponent = d.key;
            currentView = 'component';
            update();
        });

    g.selectAll('.arc-label')
        .data(categoryData)
        .enter().append('text')
        .attr('class', 'arc-label')
        .attr('transform', d => `translate(${arc.centroid(d)})`)
        .attr('dy', '0.35em')
        .style('text-anchor', 'middle')
        .style('fill', '#fff')
        .style('font-size', '12px')
        .style('font-weight', 'bold')
        .text(d => d.category.split(' ')[0])
        .append('tspan')
        .attr('x', 0)
        .attr('dy', '1.2em')
        .text(d => d.value.toFixed(2));

    narrativeText.html(`
        <h3>${countryData.country}'s Social Progress</h3>
        <p>Overall SPI Score: <strong>${(+countryData.spi_score).toFixed(2)}</strong> (Rank: ${countryData.spi_rank})</p>
        <p>This chart shows the three main pillars of social progress for ${countryData.country}. Click on a colored segment to drill down further into its sub-components and see what drives this country's performance.</p>
    `);
}

// Scene: Component Detail
function createComponentDetail(countryData, componentKey) {
    const svg = container.append('svg').attr('width', '100%').attr('height', '100%');
    const componentMap = {
        basic_human_needs: ['basic_nutri_med_care', 'water_sanitation', 'shelter', 'personal_safety'],
        wellbeing: ['access_basic_knowledge', 'access_info_comm', 'health_wellness', 'env_quality'],
        opportunity: ['personal_rights', 'personal_freedom_choice', 'inclusiveness', 'access_adv_edu']
    };
    const subComponents = componentMap[componentKey];
    const subComponentData = subComponents.map(key => ({ key, value: +countryData[key] }));

    const componentName = componentKey.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    svg.append('text').attr('x', '50%').attr('y', 40).attr('text-anchor', 'middle').style('font-size', '24px').style('font-weight', 'bold').text(`${componentName} in ${countryData.country}`);

    const xScale = d3.scaleBand().domain(subComponents.map(d => d.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()))).range([100, 860]).padding(0.4);
    const yScale = d3.scaleLinear().domain([0, 100]).range([500, 100]);

    svg.append('g').attr('transform', 'translate(0, 500)').call(d3.axisBottom(xScale).tickSize(0).tickPadding(10)).selectAll('text').style('font-size', '12px').attr('transform', 'rotate(-45)').style('text-anchor', 'end');
    svg.append('g').attr('transform', 'translate(100, 0)').call(d3.axisLeft(yScale).ticks(5).tickSize(-760).tickPadding(10));

    svg.selectAll('rect')
        .data(subComponentData)
        .enter()
        .append('rect')
        .attr('x', d => xScale(d.key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())))
        .attr('y', 500)
        .attr('width', xScale.bandwidth())
        .attr('height', 0)
        .style('fill', '#3498db')
        .transition().duration(1000)
        .attr('y', d => yScale(d.value))
        .attr('height', d => 500 - yScale(d.value));

    narrativeText.html(`
        <h3>Deep Dive: ${componentName}</h3>
        <p>This chart breaks down the <strong>${componentName}</strong> score into its core components. This reveals the specific areas where ${countryData.country} is performing well and where there are challenges. For example, a high score in 'Water and Sanitation' but a low score in 'Personal Safety' can tell a powerful story about the country's development priorities and outcomes.</p>
    `);
}

// Initial call
update();