#!/usr/bin/env python
import execo
import execo_g5k
# import itertools

print 'Submitting job request'
[(jobid, site)] = execo_g5k.oarsub([
    (execo_g5k.OarSubmission(resources="nodes=2"), "grenoble")
])

server_cmd = 'cd pando.js && node test/spawn-node.js'
worker_cmd = 'cd pando.js && node test/volunteer.js %s'
params = execo_g5k.default_oarsh_oarcp_params

if jobid:
    try:
        print 'Waiting for job to start'
        execo_g5k.wait_oar_job_start(jobid, site)
        print 'Retrieving nodes'
        nodes = execo_g5k.get_oar_job_nodes(jobid, site)
	print nodes
        if (len(nodes) >= 2):
            server = execo.Remote(
                    server_cmd,
                    nodes[0],
                    connection_params=params)
            with server.start():
                execo.sleep(0.5)
                (h,i,m) = server.expect(r'^(\/ip4\/172.*)')[0]
                multiaddr = m.group()
		print 'Starting workers with cmd: ' + worker_cmd%(multiaddr)
                workers = execo.Remote(
                        worker_cmd%(multiaddr),
                        nodes[1:],
                        connection_params=params)
		workers.expect('Node ready')
		print 'Workers ready'
		print 'Started processing'
		server.expect('done')
		print 'Processing done'
                print execo.Report([server, workers]).to_string()
		for index,p in enumerate(server):
                    print p.stdout
        else:
            print 'Insufficient number of nodes'

    finally:
        execo_g5k.oardel([(jobid, site)])
