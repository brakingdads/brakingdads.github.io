<script>
	export let today;
	export let nextSevenDays = [];

	async function getOpeningTimes() {
		const res = await fetch('data/opening-times.json', {
			method: 'GET'
		});

		const openingTimes = await res.json();

		const now = new Date();
		
		today = getOpeningTimesForDate(now, openingTimes);

		const newDays = [];

		for(let i = 1; i <= 7; i++) {
			now.setDate(now.getDate() + 1);
			const futureOpeningTimes = getOpeningTimesForDate(now, openingTimes);
			newDays.push(futureOpeningTimes);
		}

		nextSevenDays = newDays;

		console.log(nextSevenDays);
	};

	function getOpeningTimesForDate(date, openingTimes) {
		const month = date.toLocaleString('default', { month: 'long' }).toLowerCase();
		const dayName = date.toLocaleDateString('default', { weekday: 'short' });
    	const day = '' + date.getDate();
		const year = '' + date.getFullYear();
		
		const monthData = openingTimes[month];

		if(monthData == null) {
			return errorOpeningTimes(year, month, day);
		}

		const dayData = monthData.times[day];

		if(dayData == null) {
			return errorOpeningTimes(year, month, day);
		}

		return {
			source: monthData.source,
			day: day,
			dayName: dayName,
			month: capitalize(month),
			statusText: dayData.openStatus,
			status: refineOpenStatus(dayData.openStatus),
        	audience: dayData.audience
		}
	}

	function refineOpenStatus(text) {
		const closedUntil = text.match(/^closed.*until[^0-9]*([0-9\.]+)(pm|am)?.*$/i);
		if(closedUntil != null) {
			return {
				open: true,
				label: 'Open After ' + closedUntil[1] + amPm(closedUntil[2])
			}
		}

		const closedFrom = text.match(/^closed.*from[^0-9]*([0-9\.]+)(pm|am)?.*$/i);
		if(closedFrom != null) {
			return {
				open: false,
				label: 'Closed From ' + closedFrom[1] + amPm(closedFrom[2])
			}
		}

		const closedBetween = text.match(/^closed[^0-9]*([0-9\.]+)(pm|am)?.*to[^0-9]+([0-9\.]+)(pm|am)?.*$/i);
		if(closedBetween != null) {
			return {
				open: true,
				label: 'Open After ' + closedBetween[3] + amPm(closedBetween[4])
			}
		}

		const closed = text.match(/^.*open.*$/i);
		if(closed != null) {
			return {
				open: true,
				label: 'Open'
			}
		}

		return {
			open: false,
			label: 'Closed'
		}
	}

	function capitalize(s) {
		return s && s[0].toUpperCase() + s.slice(1);
	}

	function amPm(text) {
		if(text == null) {
			return '';
		} else {
			return text.toUpperCase()
		}
	}

	function errorOpeningTimes(year, month, day) {
		return {
			source: 'https://www.gov.uk/government/publications/south-east-training-estate-firing-times/aldershot-training-area-closure-times-' + month + '-' + year,
			day: day,
			month: month,
			openStatus: '???',
        	audience: ''
		}
	}

	getOpeningTimes();
</script>

<main>
	<div class="container py-3">	  
		<div class="header p-3 pb-md-4 mx-auto text-center">
		  <img id="logo" width="200" height="200" alt="Braking Dads Logo" src="/img/braking-dads-logo.png" />
		</div>
	  
		<main>
		  <div class="row row-cols-1 row-cols-md-3 mb-3 text-center justify-content-center">
			{#if today != null}
			<div class="col">
			  <div class="card mb-4 rounded-3 shadow-sm { today.status.open ? 'border-success': ''}">
				<div class="card-header py-3 { today.status.open ? 'text-white bg-success border-success': ''}">
				  <h4 class="my-0 fw-normal">Today</h4>
				</div>
				
				<div class="card-body">
				  <h2 class="card-title">Long Valley is {today.status.label}</h2>
				  <ul class="list-unstyled mt-3 mb-4">
					<li>{today.dayName} {today.day} {today.month}</li>
					<li>{today.statusText}</li>
					<li>{today.audience}</li>
				  </ul>
				  <a href="{today.source}">
				  	<button type="button" class="w-100 btn btn-lg { today.status.open ? 'btn-success': 'btn-secondary'}">Source</button>
				  </a>
				</div>
			  </div>
			</div>
			{/if}
		  </div>

		  <div class="seven-days header p-3 pb-md-4 mx-auto text-center">
		  	<p class="fs-5 text-muted">Next seven days</p>
		  </div>

		  <div class="row row-cols-7 row-cols-md-4 mb-4 text-center justify-content-center">
			{#each nextSevenDays as day}
				<div class="col">
					<div class="card mb-4 rounded-3 shadow-sm { day.status.open ? 'border-success': ''}">
					<div class="card-header py-3 { day.status.open ? 'text-white bg-success border-success': ''}">
						<h5 class="my-0 fw-normal">{day.dayName} {day.day} {day.month}</h5>
					</div>
					
					<div class="card-body">
						<h5 class="card-title">{day.status.label}</h5>
						<ul class="list-unstyled mt-3 mb-4">
						<li>{day.statusText}</li>
						<li>{day.audience}</li>
						</ul>
						<a href="{day.source}">
							<button type="button" class="w-100 btn btn-lg { day.status.open ? 'btn-success': 'btn-secondary'}">Source</button>
						</a>
					</div>
					</div>
				</div>
			{/each}
		  </div>

	
	  
		<footer class="pt-4 my-md-5 pt-md-5 border-top">
		  <div class="row">
			<div class="col-12 col-md">
			  <h4>Braking Dads</h4>
			  <small class="d-block mb-3 text-muted">© 2021</small>
			</div>
			<!-- <div class="col-6 col-md">
			  <h5>About</h5>
			  <ul class="list-unstyled text-small">
				<li class="mb-1"><a class="link-secondary text-decoration-none" href="https://github.com/brakingdads">Source Code</a></li>
			  </ul>
			</div> -->
		  </div>
		</footer>
	  </div>

</main>

<style>
	.seven-days {
		border-top: 1px solid #dee2e6!important;
		margin-top: 30px;
    	padding-top: 10px;

		width: 75%;
	}

	#logo {
		margin-bottom: 30px;
	}
</style>