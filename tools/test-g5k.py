#!/usr/bin/env python
import execo
import execo_g5k
import time
import argparse

parser = argparse.ArgumentParser(description='Run the spawn-node/volunteer test on Grid5000')
parser.add_argument('volunteers', metavar='N', type=int,
                    help='number of volunteer nodes to use (8 cores per node)', default=1)

args = parser.parse_args()

nb_nodes = (args.volunteers + 1) 
print 'Submitting job request for %i nodes (%i cores)'%(nb_nodes,nb_nodes*8)
[(jobid, site)] = execo_g5k.oarsub([
    (execo_g5k.OarSubmission(resources="nodes=%i" % nb_nodes, job_type="allow_classic_ssh"), "grenoble")
])

server_cmd = 'node pando.js/test/spawn-node.js'
worker_cmd = 'node pando.js/test/volunteer.js %s'
params = execo_g5k.default_oarsh_oarcp_params

if jobid:
    try:
        print 'Waiting for job to start'
        execo_g5k.wait_oar_job_start(jobid, site)
        print 'Retrieving nodes'
        nodes = execo_g5k.get_oar_job_nodes(jobid, site)
	# Open one connection per core (there are 8 cores per node in grenoble) 
	cores = nodes * 8
        if (len(cores) >= 2):
	    print 'Starting server'
            server = execo.TaktukRemote(
                    server_cmd,
                    cores[0])
            with server.start():
                execo.sleep(0.5)
                (h,i,m) = server.expect(r'^(\/ip4\/172.*)')[0]
                multiaddr = m.group()
		print 'Starting workers with cmd: ' + worker_cmd%(multiaddr)
                workers = execo.TaktukRemote(
                        worker_cmd%(multiaddr),
                        cores[1:]).start()
		workers.expect('Node ready')
		print 'Workers ready'
		start_time = time.time()
		print 'Started processing'
		server.expect('done')
	        stop_time = time.time()
		print 'Processing done in %fs'%(stop_time-start_time)
                print execo.Report([server, workers]).to_string()
		for index,p in enumerate(server.processes):
		    with open('server-out.log', 'w') as f:
                    	f.write(p.stdout)
        else:
            print 'Insufficient number of cores'

    finally:
        execo_g5k.oardel([(jobid, site)])
