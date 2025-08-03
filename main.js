let currentView = 'intro';
let currentCountry = null;
let currentComponent = null;
let currentContinent = 'all';

const container = d3.select('#narrative-container');

const narrativeText = d3.select('#narrative-text');
const tooltip = d3.select('#tooltip');
const backButton = d3.select('#back');

let spiData, worldData;
Promise.all([
    d3.csv('spi22.csv'),
    d3.json('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json')
]).then(([spi, world]) => {
    spiData = spi;
    worldData = world;
    populate();
});

backButton.on('click', () => {
    if (currentView === 'component') {
        currentView = 'country';
    } else if (currentView === 'country') {
        currentView = 'world';
        currentCountry = null;
    }
    populate();
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
                populate();
            });
    });
}

function populate() {
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
    }
}

// Scene: Introduction
function createIntroScene() {
    const intro = container.append('div')
        .style('padding', '50px')
        .style('opacity', 0);

    intro.html(`
        <h2>What is Social Progress?</h2>

        <p id="desc">
            Societal progress is a normative concept and can be defined as the change or advancement of major conditions of societies and people's lives in a direction considered to be desirable based on prevailing values and goals of development.
            <b>Social Progress Index (SPI)</b> gives us a holistic view of how countries are doing beyond GDP, measuring how well they meet the basic human needs of their citizens, the building blocks of wellbeing, and the foundations of opportunity.
            
            <br><br>

            This interactive story allows you to explore the 2022 SPI data, from a global overview down to the specific continents into factors that shape the lives of people around the world.
        </p>
        
        <button class="intro-button">Let's Begin Exploring</button>
    `)

    intro.transition()
        .duration(1000)
        .style('opacity', 1);

    intro.select('.intro-button')
        .on('click', () => {
            currentView = 'world';
            populate();
        });

    narrativeText.html('');
}

// Scene: World Map
function createWorldMap() {
    const svg = container.append('svg').attr('viewBox', '0 0 960 600');
    const projection = d3.geoMercator().scale(130).translate([480, 350]);
    const path = d3.geoPath().projection(projection);
    const spiDataByCountry = new Map(spiData.map(d => [d.country, d]));
    const colorScale = d3.scaleSequential(d3.interpolateYlGn).domain([40, 100]);

    let countries = topojson.feature(worldData, worldData.objects.countries).features;

    if (currentContinent !== 'all') {
        countries = countries.filter(d => {
            const countryData = spiData.find(spi => spi.country === d.properties.name);
            return countryData && countryData.continent === currentContinent;
        });
    }

    const filteredSpiData = spiData
        .filter(d => currentContinent === 'all' || d.continent === currentContinent)
        .sort((a, b) => b.spi_score - a.spi_score);

    const top3Countries = filteredSpiData.slice(0, 3);
    const bottom3Countries = filteredSpiData.slice(-3).sort((a, b) => a.spi_score - b.spi_score);

    const chartsContainer = container.append('div')
        .attr('class', 'charts-container');

    // Top 3 Chart
    const topBarChartContainer = chartsContainer.append('div')
	.attr('class', 'chart-container');

    topBarChartContainer.append('h4').text(`Top 3 in ${currentContinent === 'all' ? 'the World' : currentContinent}`);

    const topBarSvg = topBarChartContainer.append('svg').attr('width', '100%').attr('height', 120);

    const topYScale = d3.scaleBand()
        .domain(top3Countries.map(d => d.country))
        .range([0, 120])
        .padding(0.1);

    const topXScale = d3.scaleLinear()
        .domain([0, 100])
        .range([0, 230]);

    topBarSvg.selectAll('.bar')
        .data(top3Countries)
        .enter()
        .append('rect')
        .attr('class', 'bar')
        .attr('y', d => topYScale(d.country))
        .attr('height', topYScale.bandwidth())
        .attr('width', 0)
        .style('fill', d => colorScale(d.spi_score))
        .transition()
        .duration(1000)
        .attr('width', d => topXScale(d.spi_score));

    topBarSvg.selectAll('.bar-label')
        .data(top3Countries)
        .enter()
        .append('text')
        .attr('class', 'bar-label')
        .attr('x', 5)
        .attr('y', d => topYScale(d.country) + topYScale.bandwidth() / 2)
        .attr('dy', '0.35em')
        .style('fill', '#fff')
        .text(d => `${d.country} (${(+d.spi_score).toFixed(2)})`);

    // Bottom 3 Chart
    const bottomBarChartContainer = chartsContainer.append('div')
	.attr('class', 'chart-container');

    bottomBarChartContainer.append('h4').text(`Bottom 3 in ${currentContinent === 'all' ? 'the World' : currentContinent}`);

    const bottomBarSvg = bottomBarChartContainer.append('svg').attr('width', '100%').attr('height', 120);

    const bottomYScale = d3.scaleBand()
        .domain(bottom3Countries.map(d => d.country))
        .range([0, 120])
        .padding(0.1);

    const bottomXScale = d3.scaleLinear()
        .domain([0, 100])
        .range([0, 230]);

    bottomBarSvg.selectAll('.bar')
        .data(bottom3Countries)
        .enter()
        .append('rect')
        .attr('class', 'bar')
        .attr('y', d => bottomYScale(d.country))
        .attr('height', bottomYScale.bandwidth())
        .attr('width', 0)
        .style('fill', d => colorScale(d.spi_score))
        .transition()
        .duration(1000)
        .attr('width', d => bottomXScale(d.spi_score));

    bottomBarSvg.selectAll('.bar-label')
        .data(bottom3Countries)
        .enter()
        .append('text')
        .attr('class', 'bar-label')
        .attr('x', 5)
        .attr('y', d => bottomYScale(d.country) + bottomYScale.bandwidth() / 2)
        .attr('dy', '0.35em')
        .style('fill', 'orange')
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
        .style('opacity', 0)
        .transition()
        .duration(1000)
        .style('opacity', 1);

    svg.selectAll('.country').on('mouseover', (event, d) => {
            const countryData = spiDataByCountry.get(d.properties.name);
            tooltip.style('opacity', 1)
                .html(`${d.properties.name}<br>SPI: ${countryData ? (+countryData.spi_score).toFixed(2) : 'N/A'}`)
                .style('left', (event.pageX + 10) + 'px')
                .style('top', (event.pageY - 28) + 'px');
        })
        .on('mouseout', () => tooltip.style('opacity', 0))
        .on('click', (event, d) => {
            tooltip.style('opacity', 0);
            const countryData = spiDataByCountry.get(d.properties.name);
            if (countryData) {
                currentCountry = countryData;
                currentView = 'country';
                populate();
            }
        });

    narrativeText.html(`
        The map shows overall Social Progress Index score for each country. Darker shades indicate higher social progress.
        
        <hr>
        
        Let\'s dive into a region of contrasts and explore emerging stories about social progress. Which countries are leading in social progress, and which are being left behind?
    `);

}

// Scene: Country Dashboard
function createCountryDashboard(countryData) {
    const componentMap = {
        basic_human_needs: ['basic_nutri_med_care', 'water_sanitation', 'shelter', 'personal_safety'],
        wellbeing: ['access_basic_knowledge', 'access_info_comm', 'health_wellness', 'env_quality'],
        opportunity: ['personal_rights', 'personal_freedom_choice', 'inclusiveness', 'access_adv_edu']
    };

    const nameMap = {
        'basic_nutri_med_care': 'Nutrition and Basic Medical Care',
        'water_sanitation': 'Water and Sanitation',
        'shelter': 'Shelter',
        'personal_safety': 'Personal Safety',
        'access_basic_knowledge': 'Access to Basic Knowledge',
        'access_info_comm': 'Access to Information and Communications',
        'health_wellness': 'Health and Wellness',
        'env_quality': 'Environmental Quality',
        'personal_rights': 'Personal Rights',
        'personal_freedom_choice': 'Personal Freedom and Choice',
        'inclusiveness': 'Inclusiveness',
        'access_adv_edu': 'Access to Advanced Education'
    };

    const hierarchyData = {
        name: "root",
        children: [
            {
                name: 'Basic Human Needs',
                key: 'basic_human_needs',
                children: componentMap.basic_human_needs.map(key => ({ name: nameMap[key], value: +countryData[key], key: key }))
            },
            {
                name: 'Foundations of Wellbeing',
                key: 'wellbeing',
                children: componentMap.wellbeing.map(key => ({ name: nameMap[key], value: +countryData[key], key: key }))
            },
            {
                name: 'Opportunity',
                key: 'opportunity',
                children: componentMap.opportunity.map(key => ({ name: nameMap[key], value: +countryData[key], key: key }))
            }
        ]
    };

    const svg = container.append('svg').attr('viewBox', '0 0 960 600');
    svg.append('text').attr('x', '50%').attr('y', 40).attr('text-anchor', 'middle').style('font-size', '28px').style('font-weight', 'bold').text(countryData.country);

    const width = 960, height = 600, radius = Math.min(width, height) / 2.5;
    const g = svg.append('g').attr('transform', `translate(${width / 2},${height / 2 + 20})`);

    const color = d3.scaleOrdinal()
        .domain(['Basic Human Needs', 'Foundations of Wellbeing', 'Opportunity'])
        .range(d3.schemeTableau10.slice(0,3));


    const partition = d3.partition().size([2 * Math.PI, radius]);

    const root = d3.hierarchy(hierarchyData)
        .sum(d => d.value);

    partition(root);

    const arc = d3.arc()
        .startAngle(d => d.x0)
        .endAngle(d => d.x1)
        .innerRadius(d => d.y0)
        .outerRadius(d => d.y1);

    g.selectAll('path')
        .data(root.descendants().slice(1))
        .enter().append('path')
        .attr('d', arc)
        .style('fill', d => {
            if (d.depth === 1) {
                return color(d.data.name);
            }
            if (d.parent) {
                const baseColor = color(d.parent.data.name);
                // Create a scale for shades of the base color
                const shade = d3.scaleLinear()
                    .domain([0, d.parent.children.length])
                    .range([d3.color(baseColor).brighter(0.5), d3.color(baseColor).darker(0.5)]);
                return shade(d.parent.children.indexOf(d));
            }
            return '#ccc';
        })
        .style('cursor', 'pointer')
        .on('mouseover', (event, d) => {
            tooltip.style('opacity', 1)
                .html(`<strong>${d.data.name}</strong><br>Score: ${d.value.toFixed(2)}`)
                .style('left', (event.pageX + 10) + 'px')
                .style('top', (event.pageY - 28) + 'px');
        })
        .on('mouseout', () => {
            tooltip.style('opacity', 0);
        }).on('click', (event, d) => {
            tooltip.style('opacity', 0);


            if (d.depth === 1) {
                currentComponent = d.data.key;
                currentView = 'component';
                populate();
            }
        });
    
    g.selectAll('text')
        .data(root.descendants().slice(1))
        .enter()
        .append('text')
        .attr('transform', function(d) {
            const x = (d.x0 + d.x1) / 2 * 180 / Math.PI;
            const y = (d.y0 + d.y1) / 2;
            return `rotate(${x - 90}) translate(${y},0) rotate(${x < 180 ? 0 : 180})`;
        })
        .attr('dy', '0.35em')
        .style('text-anchor', 'middle')
        .style('font-size', '10px')
        .style('fill', 'white')
        .text(d => d.depth == 1 ? d.data.name : '');

    narrativeText.html(`
        SPI is not a black box. It breaks into three core pillars—Basic Human Needs, Foundations of Wellbeing, and Opportunity. Which pillar drives success in the region? Where are the gaps?
        <hr>

        <h3>${countryData.country}'s Social Progress</h3>
        <p>Overall SPI Score: <strong>${(+countryData.spi_score).toFixed(2)}</strong> (Rank: ${countryData.spi_rank})</p>
        <p>This sunburst chart shows the three main pillars of social progress for ${countryData.country} and their sub-components. The value of each sub-component is shown as a tooltip. Click on an inner ring segment to drill down further.</p>
    `);
}

function createComponentDetail(countryData, componentKey) {
    const svg = container.append('svg').attr('viewBox', '0 0 960 600');
    const componentMap = {
        basic_human_needs: ['basic_nutri_med_care', 'water_sanitation', 'shelter', 'personal_safety'],
        wellbeing: ['access_basic_knowledge', 'access_info_comm', 'health_wellness', 'env_quality'],
        opportunity: ['personal_rights', 'personal_freedom_choice', 'inclusiveness', 'access_adv_edu']
    };
    const nameMap = {
        'basic_nutri_med_care': 'Nutrition and Basic Medical Care',
        'water_sanitation': 'Water and Sanitation',
        'shelter': 'Shelter',
        'personal_safety': 'Personal Safety',
        'access_basic_knowledge': 'Access to Basic Knowledge',
        'access_info_comm': 'Access to Information and Communications',
        'health_wellness': 'Health and Wellness',
        'env_quality': 'Environmental Quality',
        'personal_rights': 'Personal Rights',
        'personal_freedom_choice': 'Personal Freedom and Choice',
        'inclusiveness': 'Inclusiveness',
        'access_adv_edu': 'Access to Advanced Education'
    };
    const subComponents = componentMap[componentKey];
    const subComponentData = subComponents.map(key => ({ name: nameMap[key], value: +countryData[key] })).sort((a, b) => b.value - a.value);

    const componentName = componentKey.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    svg.append('text').attr('x', '50%').attr('y', 40).attr('text-anchor', 'middle').style('font-size', '24px').style('font-weight', 'bold').text(`${componentName} in ${countryData.country}`);

    const xScale = d3.scaleBand().domain(subComponentData.map(d => d.name)).range([100, 860]).padding(0.4);
    const yScale = d3.scaleLinear().domain([0, 100]).range([500, 100]);
    const color = d3.scaleOrdinal()
        .domain(['Basic Human Needs', 'Foundations of Wellbeing', 'Opportunity'])
        .range(d3.schemeTableau10.slice(0,3));

    const baseColor = color(componentKey.split('_')[0].charAt(0).toUpperCase() + componentKey.split('_')[0].slice(1) + (componentKey.split('_').length > 1 ? ' ' + componentKey.split('_')[1].charAt(0).toUpperCase() + componentKey.split('_')[1].slice(1) : ''));
    const shade = d3.scaleLinear()
        .domain([0, subComponentData.length])
        .range([d3.color(baseColor).brighter(0.5), d3.color(baseColor).darker(0.5)]);

    svg.append('g').attr('transform', 'translate(0, 500)').call(d3.axisBottom(xScale).tickSize(0).tickPadding(10)).selectAll('text').style('font-size', '12px').attr('transform', 'rotate(-45)').style('text-anchor', 'end');
    svg.append('g').attr('transform', 'translate(100, 0)').call(d3.axisLeft(yScale).ticks(5).tickSize(-760).tickPadding(10));

    svg.selectAll('rect')
        .data(subComponentData)
        .enter()
        .append('rect')
        .attr('x', d => xScale(d.name))
        .attr('y', 500)
        .attr('width', xScale.bandwidth())
        .attr('height', 0)
        .style('fill', (d, i) => shade(i))
        .transition().duration(1000)
        .attr('y', d => yScale(d.value))
        .attr('height', d => 500 - yScale(d.value));

    narrativeText.html(`
        <h3>Deep Dive: ${componentName}</h3>

        <p>This chart breaks down the <strong>${componentName}</strong> score into its core components. This reveals the specific areas where ${countryData.country} is performing well and where there are challenges.</p>
    `);
}


// Initial call
populate();